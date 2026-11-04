import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { scopeTo } from "@wasanni/db";
import { agentProject, agentProvider, agentSession, organization } from "@wasanni/db/schema";
import type { AgentAttachment, AgentRunMode, AgentRunStatus, RunAgentBody } from "@wasanni/contracts";
import type { Logger, Scope } from "@wasanni/kit";
import { BadRequestError, decryptSecret, newId, NotFoundError } from "@wasanni/kit";
import {
  DEFAULT_SYSTEM_PROMPT,
  MAX_ERROR_LENGTH,
  MODE_INSTRUCTIONS,
  PLATFORM_PROVIDER_NAME,
  SESSION_TITLE_LENGTH,
  TEXT_ATTACHMENT_EXTENSIONS,
} from "./constants.ts";
import type { ProviderEndpoint } from "./transport.ts";
import { catalogModel, estimateCostMicros } from "./catalog.ts";
import { createAgentTools } from "./tools.ts";
import { classifyProviderError } from "./provider-error.ts";
import type { AgentRunOutcome } from "./run-agent.ts";
import type { ProviderFailure } from "./provider-error.ts";
import type {
  AgentGameContext,
  AgentModuleDeps,
  AgentOrgContext,
  ProviderRow,
  RunEvent,
  RunLeg,
  SessionRow,
} from "./types.ts";

export const NO_KEY = "unset";

const isTextAttachment = (attachment: AgentAttachment): boolean => {
  const extension = attachment.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    TEXT_ATTACHMENT_EXTENSIONS.includes(
      extension as (typeof TEXT_ATTACHMENT_EXTENSIONS)[number],
    ) || attachment.mediaType.startsWith("text/")
  );
};

const fence = (block: { name: string; language: string; body: string }): string =>
  `\`\`\`${block.language}|${block.name}\n${block.body}\n\`\`\``;

export const withAttachments = (
  prompt: string,
  attachments: RunAgentBody["attachments"],
): { prompt: string; others: RunAgentBody["attachments"] } => {
  const text = (attachments ?? []).filter(isTextAttachment);
  const others = (attachments ?? []).filter((entry) => !isTextAttachment(entry));
  const blocks = text.map((attachment) => ({
    name: attachment.name,
    language: attachment.name.split(".").pop()?.toLowerCase() ?? "txt",
    body: new TextDecoder().decode(
      Uint8Array.from(atob(attachment.data), (character) => character.charCodeAt(0)),
    ),
  }));

  return {
    prompt:
      blocks.length === 0
        ? prompt
        : `${prompt}\n\n${blocks.map(fence).join("\n\n")}`,
    others,
  };
};

const statusOf = (
  failure: ProviderFailure | null,
  outcome: AgentRunOutcome | null,
  parked: RunLeg["parked"],
): AgentRunStatus =>
  failure !== null || outcome === null
    ? "failed"
    : parked !== null
      ? "awaiting_approval"
      : outcome.contentFilter
        ? "refused"
        : "succeeded";

export const errorOf = (leg: RunLeg): string | null =>
  leg.failure === null
    ? leg.state === "failed"
      ? "provider_unknown: the answer never completed"
      : null
    : `${leg.failure.code}: ${leg.failure.message}`.slice(0, MAX_ERROR_LENGTH);

const cancelledLeg = (): RunLeg => ({
  state: "failed",
  output: "",
  parked: null,
  failure: null,
  promptTokens: 0,
  completionTokens: 0,
  cacheReadTokens: 0,
  trimmedMessages: 0,
});

export type RunNumbers = {
  readonly durationMs: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly costMicros: number;
};

export const titleOf = (prompt: string): string => {
  const trimmed = prompt.trim().replace(/\s+/g, " ");

  return trimmed.length <= SESSION_TITLE_LENGTH
    ? trimmed
    : `${trimmed.slice(0, SESSION_TITLE_LENGTH - 1)}…`;
};

export function createAgentInternals(deps: AgentModuleDeps) {
  const {
    api,
    audit,
    db,
    docsJsonPath,
    allowPrivateOutbound,
    encryptionKey,
    games,
    integrator,
    logger,
    platformProvider,
    runtime,
  } = deps;

  const keyOf = (row: ProviderRow | null): string => {
    if (row === null) return platformProvider?.apiKey ?? NO_KEY;
    return row.apiKeyCiphertext === null
      ? NO_KEY
      : decryptSecret(row.apiKeyCiphertext, encryptionKey);
  };

  const endpointFrom = (input: {
    spec: string;
    baseUrl: string;
    model: string;
    apiKey: string;
    maxRequestTokens?: number | null;
  }): ProviderEndpoint => ({
    spec: input.spec,
    baseUrl: input.baseUrl,
    model: input.model,
    apiKey: input.apiKey,
    allowPrivateOutbound,
    maxRequestTokens: input.maxRequestTokens ?? null,
  });

  const endpointOf = (row: ProviderRow | null): ProviderEndpoint =>
    endpointFrom({
      spec: row?.spec ?? "custom",
      baseUrl: row?.baseUrl ?? platformProvider?.baseUrl ?? "",
      model: row?.model ?? platformProvider?.model ?? "",
      apiKey: keyOf(row),
      maxRequestTokens: row?.maxRequestTokens ?? null,
    });

  const readProvider = async (
    scope: Scope,
    providerId: string,
  ): Promise<ProviderRow> => {
    const [row] = await db
      .select()
      .from(agentProvider)
      .where(scopeTo(scope, agentProvider, eq(agentProvider.id, providerId)))
      .limit(1);

    if (row === undefined) throw new NotFoundError("agent provider not found");

    return row;
  };

  const chosen = async (
    scope: Scope,
    providerId?: string,
  ): Promise<ProviderRow | null> => {
    if (providerId !== undefined) return readProvider(scope, providerId);

    const [row] = await db
      .select()
      .from(agentProvider)
      .where(scopeTo(scope, agentProvider))
      .orderBy(desc(agentProvider.isDefault), asc(agentProvider.createdAt))
      .limit(1);

    if (row !== undefined) return row;

    if (platformProvider === null) {
      throw new BadRequestError(
        "this workspace has no model provider; add one or run against your own key",
      );
    }

    return null;
  };

  const readOrg = async (scope: Scope): Promise<AgentOrgContext> => {
    const [row] = await db
      .select({ id: organization.id, name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, scope.organizationId))
      .limit(1);

    if (row === undefined) throw new NotFoundError("organization not found");

    return row;
  };

  const visibleTo = (memberId: string) =>
    or(
      isNull(agentSession.createdByMemberId),
      eq(agentSession.createdByMemberId, memberId),
    );

  const projectVisibleTo = (memberId: string) =>
    or(
      isNull(agentProject.createdByMemberId),
      eq(agentProject.createdByMemberId, memberId),
    );

  const readProject = async (
    scope: Scope,
    memberId: string,
    projectId: string,
  ): Promise<typeof agentProject.$inferSelect> => {
    const [row] = await db
      .select()
      .from(agentProject)
      .where(
        scopeTo(
          scope,
          agentProject,
          eq(agentProject.id, projectId),
          projectVisibleTo(memberId),
        ),
      )
      .limit(1);

    if (row === undefined) throw new NotFoundError("agent project not found");

    return row;
  };

  const readSession = async (
    scope: Scope,
    memberId: string,
    sessionId: string,
  ): Promise<SessionRow> => {
    const [row] = await db
      .select()
      .from(agentSession)
      .where(
        scopeTo(
          scope,
          agentSession,
          eq(agentSession.id, sessionId),
          visibleTo(memberId),
        ),
      )
      .limit(1);

    if (row === undefined) throw new NotFoundError("agent session not found");

    return row;
  };

  const newSession = async (
    scope: Scope,
    memberId: string,
    title: string,
    gameId: string | null,
    projectId: string | null,
  ): Promise<SessionRow> => {
    const [row] = await db
      .insert(agentSession)
      .values({
        id: newId(),
        organizationId: scope.organizationId,
        createdByMemberId: memberId,
        gameId,
        projectId,
        title,
      })
      .returning();

    if (row === undefined) throw new NotFoundError("agent session not found");

    await runtime.memory.createThread({
      threadId: row.id,
      resourceId: `${row.organizationId}:${row.createdByMemberId}`,
      title,
    });

    return row;
  };

  const systemOf = (
    org: AgentOrgContext,
    gameContext: AgentGameContext | null,
    mode: AgentRunMode,
  ): string =>
    `${DEFAULT_SYSTEM_PROMPT}\n${MODE_INSTRUCTIONS[mode]}\nThis chat runs inside the organization "${org.name}" (id ${org.id}, slug ${org.slug}). Use that organization directly; never ask the user to supply an organization id, slug, or name.` +
    (gameContext === null
      ? ""
      : `\nThis chat is bound to the game "${gameContext.name}" (id ${gameContext.id}, slug ${gameContext.slug}, hosting ${gameContext.hosting}, status ${gameContext.status}, current version ${gameContext.currentVersion ?? "none"}). deploy_game publishes to this game.`);

  const toolsFor = (
    scope: Scope,
    actor: { memberId: string; userId: string },
    agentRunId: string,
    gameId: string | null,
    log: Logger,
  ) =>
    createAgentTools({
      api,
      games,
      integrator,
      docsJsonPath,
      scope,
      actor,
      agentRunId,
      gameId,
      log,
      audit,
    });

  const touchSession = (sessionId: string) =>
    db
      .update(agentSession)
      .set({ updatedAt: new Date() })
      .where(eq(agentSession.id, sessionId));

  const logOf = (requestId: string, scope: Scope, runId: string): Logger =>
    logger.child({ requestId, organizationId: scope.organizationId, runId });

  const logFailure = (
    log: Logger,
    provider: ProviderRow | null,
    model: string,
    failure: ProviderFailure | null,
  ) =>
    log.warn("agent.run_failed", {
      provider: provider === null ? PLATFORM_PROVIDER_NAME : provider.name,
      model,
      code: failure?.code ?? "provider_unknown",
      statusCode: failure?.statusCode ?? null,
      providerRequestId: failure?.providerRequestId ?? null,
      err: failure?.message ?? "the answer never completed",
    });

  const logRun = (
    log: Logger,
    input: {
      provider: ProviderRow | null;
      model: string;
      state: AgentRunStatus;
      costMicros: number;
      promptTokens: number;
      completionTokens: number;
      durationMs: number;
      trimmedMessages: number;
      tools: string[];
    },
  ) =>
    log.info("agent.run", {
      provider: input.provider === null ? PLATFORM_PROVIDER_NAME : input.provider.name,
      model: input.model,
      status: input.state,
      costMicros: input.costMicros,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      durationMs: input.durationMs,
      trimmedMessages: input.trimmedMessages,
      tools: input.tools,
    });

  const collectLeg = async function* (
    leg: AsyncGenerator<RunEvent, AgentRunOutcome, void>,
  ): AsyncGenerator<RunEvent, RunLeg, void> {
    const stepText = new Map<number, string>();
    let parked: Extract<RunEvent, { kind: "approval" }> | null = null;
    let outcome: AgentRunOutcome | null = null;
    let failure: ProviderFailure | null = null;

    try {
      let step = await leg.next();

      while (!step.done) {
        if (step.value.kind === "delta") {
          const previous = stepText.get(step.value.step) ?? "";
          stepText.set(step.value.step, previous + step.value.text);
        }

        if (step.value.kind === "approval") parked = step.value;

        yield step.value;
        step = await leg.next();
      }

      outcome = step.value;
    } catch (caught) {
      failure = classifyProviderError(caught);
    } finally {
      await runtime.flush();
    }

    return {
      state: statusOf(failure, outcome, parked),
      output: [...stepText.values()].join("\n\n").trim(),
      parked,
      failure,
      promptTokens: outcome?.promptTokens ?? 0,
      completionTokens: outcome?.completionTokens ?? 0,
      cacheReadTokens: outcome?.cacheReadTokens ?? 0,
      trimmedMessages: outcome?.trimmedMessages ?? 0,
    };
  };

  const settle = async function* (
    inner: AsyncGenerator<RunEvent, AgentRunOutcome, void>,
    context: {
      readonly startedAt: number;
      readonly baseline: RunNumbers;
      readonly spec: string;
      readonly model: string;
      readonly log: Logger;
      readonly provider: ProviderRow | null;
      readonly toolNames: string[];
      readonly runId: string;
      readonly sessionId: string;
      readonly journal: (leg: RunLeg, numbers: RunNumbers) => Promise<void>;
    },
  ): AsyncGenerator<RunEvent, void, void> {
    const numbersOf = (resolved: RunLeg): RunNumbers => ({
      durationMs: context.baseline.durationMs + Math.round(performance.now() - context.startedAt),
      promptTokens: context.baseline.promptTokens + resolved.promptTokens,
      completionTokens: context.baseline.completionTokens + resolved.completionTokens,
      costMicros:
        context.baseline.costMicros +
        estimateCostMicros(catalogModel(context.spec, context.model), resolved),
    });

    let leg: RunLeg | null = null;

    try {
      leg = yield* collectLeg(inner);

      const numbers = numbersOf(leg);
      await context.journal(leg, numbers);

      if (leg.state === "failed") {
        logFailure(context.log, context.provider, context.model, leg.failure);

        yield {
          kind: "error",
          code: leg.failure?.code ?? "provider_unknown",
          message: leg.failure?.message ?? "the answer never completed",
          retryable: leg.failure?.retryable ?? false,
        };

        return;
      }

      if (leg.state === "awaiting_approval") return;

      logRun(context.log, {
        provider: context.provider,
        model: context.model,
        state: leg.state,
        costMicros: numbers.costMicros,
        promptTokens: numbers.promptTokens,
        completionTokens: numbers.completionTokens,
        durationMs: numbers.durationMs,
        trimmedMessages: leg.trimmedMessages,
        tools: context.toolNames,
      });

      yield {
        kind: "done",
        runId: context.runId,
        sessionId: context.sessionId,
        model: context.model,
        costMicros: numbers.costMicros,
        promptTokens: numbers.promptTokens,
        completionTokens: numbers.completionTokens,
        durationMs: numbers.durationMs,
        trimmedMessages: leg.trimmedMessages,
      };
    } finally {
      if (leg === null) {
        const cancelled = cancelledLeg();
        await context.journal(cancelled, numbersOf(cancelled));
      }
    }
  };

  return {
    chosen,
    endpointFrom,
    endpointOf,
    logOf,
    newSession,
    projectVisibleTo,
    readOrg,
    readProject,
    readProvider,
    readSession,
    settle,
    systemOf,
    toolsFor,
    touchSession,
    visibleTo,
  };
}

export type AgentInternals = ReturnType<typeof createAgentInternals>;
