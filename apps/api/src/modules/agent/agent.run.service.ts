import { desc, eq } from "drizzle-orm";
import { agentRun } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type {
  AgentPendingApproval,
  ApproveAgentRunBody,
  RunAgentBody,
} from "@wasanni/contracts";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, newId, NotFoundError } from "@wasanni/kit";
import { READ_ONLY_TOOL_NAMES } from "./constants.ts";
import { pendingApprovals, resumeAgentRun, runAgent } from "./run-agent.ts";
import {
  errorOf,
  titleOf,
  withAttachments,
  type AgentInternals,
  type RunNumbers,
} from "./agent-internals.ts";
import type { AgentModuleDeps, RunEvent, RunLeg } from "./types.ts";

export function createAgentRunService(deps: AgentModuleDeps, i: AgentInternals) {
  const { audit, db, games, runtime } = deps;

  return {
    async *run(
      scope: Scope,
      memberId: string,
      userId: string,
      body: RunAgentBody,
      requestId: string,
      signal: AbortSignal,
    ): AsyncGenerator<RunEvent, void, void> {
      const provider = await i.chosen(scope, body.providerId);
      const endpoint = i.endpointOf(provider);
      const startedAt = performance.now();
      const runId = newId();
      const log = i.logOf(requestId, scope, runId);
      const assembled = withAttachments(body.prompt, body.attachments);
      const mode = body.mode ?? "agent";

      const session =
        body.sessionId === undefined
          ? await i.newSession(scope, memberId, titleOf(assembled.prompt), body.gameId ?? null, null)
          : await i.readSession(scope, memberId, body.sessionId);

      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      const tools = i.toolsFor(scope, { memberId, userId }, runId, session.gameId, log);
      const activeTools = mode === "plan" ? [...READ_ONLY_TOOL_NAMES] : undefined;

      yield* i.settle(
        runAgent({
          runtime,
          endpoint,
          instructions: i.systemOf(await i.readOrg(scope), gameContext, mode),
          agentRunId: runId,
          requestId,
          prompt: assembled.prompt,
          attachments: assembled.others,
          tools,
          activeTools,
          thread: session.id,
          resource: `${scope.organizationId}:${memberId}`,
          signal,
        }),
        {
          startedAt,
          baseline: { durationMs: 0 },
          model: endpoint.model,
          log,
          provider,
          toolNames: Object.keys(tools),
          runId,
          sessionId: session.id,
          journal: async (resolved: RunLeg, numbers: RunNumbers) => {
            await db.insert(agentRun).values({
              id: runId,
              organizationId: scope.organizationId,
              sessionId: session.id,
              providerId: provider?.id ?? null,
              createdByMemberId: memberId,
              createdByUserId: userId,
              model: endpoint.model,
              prompt: assembled.prompt,
              output:
                resolved.state === "failed" && resolved.output === "" ? null : resolved.output,
              status: resolved.state,
              durationMs: numbers.durationMs,
              error: errorOf(resolved),
            });

            await i.touchSession(session.id);
          },
        },
      );
    },

    async pending(
      scope: Scope,
      memberId: string,
      userId: string,
      sessionId: string,
      requestId: string,
    ): Promise<AgentPendingApproval[]> {
      const [row] = await db
        .select()
        .from(agentRun)
        .where(
          scopeTo(
            scope,
            agentRun,
            eq(agentRun.sessionId, sessionId),
            eq(agentRun.status, "awaiting_approval"),
          ),
        )
        .orderBy(desc(agentRun.createdAt))
        .limit(1);

      if (row === undefined) return [];

      const session = await i.readSession(scope, memberId, sessionId);
      const provider =
        row.providerId === null ? null : await i.readProvider(scope, row.providerId);
      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      const log = i.logOf(requestId, scope, row.id);

      return pendingApprovals({
        runtime,
        endpoint: i.endpointOf(provider),
        instructions: i.systemOf(await i.readOrg(scope), gameContext, "agent"),
        requestId,
        tools: i.toolsFor(scope, { memberId, userId }, row.id, session.gameId, log),
        thread: session.id,
        resource: `${scope.organizationId}:${memberId}`,
      });
    },

    async *approve(
      scope: Scope,
      memberId: string,
      userId: string,
      body: ApproveAgentRunBody,
      requestId: string,
      signal: AbortSignal,
    ): AsyncGenerator<RunEvent, void, void> {
      const [row] = await db
        .select()
        .from(agentRun)
        .where(scopeTo(scope, agentRun, eq(agentRun.id, body.agentRunId)))
        .limit(1);

      if (row === undefined) throw new NotFoundError("agent run not found");

      if (row.status !== "awaiting_approval") {
        throw new BadRequestError("this run is not waiting for approval");
      }

      if (row.sessionId === null) {
        throw new BadRequestError("this run has no session to resume");
      }

      const session = await i.readSession(scope, memberId, row.sessionId);
      const provider =
        row.providerId === null ? null : await i.readProvider(scope, row.providerId);
      const endpoint = i.endpointOf(provider);
      const startedAt = performance.now();

      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      const log = i.logOf(requestId, scope, row.id);
      const tools = i.toolsFor(scope, { memberId, userId }, row.id, session.gameId, log);

      await audit.record({
        organizationId: scope.organizationId,
        actor: { type: "user", userId },
        source: "agent",
        action: body.approved ? "agent_approval.accepted" : "agent_approval.rejected",
        resourceType: "agent_approval",
        resourceId: body.callId,
        metadata: { agentRunId: row.id, via: "ai" },
      });

      yield* i.settle(
        resumeAgentRun({
          runtime,
          endpoint,
          instructions: i.systemOf(await i.readOrg(scope), gameContext, "agent"),
          requestId,
          agentRunId: row.id,
          callId: body.callId,
          approved: body.approved,
          tools,
          signal,
        }),
        {
          startedAt,
          baseline: {
            durationMs: row.durationMs,
          },
          model: endpoint.model,
          log,
          provider,
          toolNames: Object.keys(tools),
          runId: row.id,
          sessionId: session.id,
          journal: async (resolved: RunLeg, numbers: RunNumbers) => {
            const output = [row.output, resolved.output].filter((part) => part !== "").join("\n");

            await db
              .update(agentRun)
              .set({
                status: resolved.state,
                output: resolved.state === "failed" && output === "" ? null : output,
                durationMs: numbers.durationMs,
                error: errorOf(resolved),
              })
              .where(eq(agentRun.id, row.id));

            await i.touchSession(session.id);
          },
        },
      );
    },
  };
}
