import { asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { agentProject, agentProvider, agentRun, agentSession, organization } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type {
  AgentAttachment,
  AgentPendingApproval,
  AgentPricing,
  AgentProjectView,
  AgentProviderView,
  AgentRunMode,
  AgentRunStatus,
  AgentRunView,
  AgentSessionView,
  AgentSpecView,
  AgentTurnView,
  ApproveAgentRunBody,
  CreateAgentProjectBody,
  CreateAgentProviderBody,
  CreateAgentSessionBody,
  RenameAgentProjectBody,
  RunAgentBody,
  UpdateAgentProviderBody,
  UpdateAgentSessionBody,
} from "@wasanni/contracts";
import type { Logger, Scope } from "@wasanni/kit";
import {
  BadRequestError,
  ConflictError,
  decryptSecret,
  encryptSecret,
  newId,
  NotFoundError,
} from "@wasanni/kit";
import {
  DEFAULT_SYSTEM_PROMPT,
  MAX_ERROR_LENGTH,
  MODE_INSTRUCTIONS,
  NEW_SESSION_TITLE,
  PLATFORM_PROVIDER_NAME,
  READ_ONLY_TOOL_NAMES,
  RECENT_SESSIONS_LIMIT,
  SESSION_TITLE_LENGTH,
  TEXT_ATTACHMENT_EXTENSIONS,
} from "./constants.ts";
import { listModels, resolveBaseUrl } from "./transport.ts";
import {
  catalogModel,
  estimateCostMicros,
  loadAgentCatalog,
} from "./catalog.ts";
import { createAgentTools } from "./tools.ts";
import { classifyProviderError } from "./provider-error.ts";
import { resumeAgentRun, runAgent, pendingApprovals } from "./run-agent.ts";
import type { AgentRunOutcome } from "./run-agent.ts";
import type { ProviderFailure } from "./provider-error.ts";
import type {
  AgentGameContext,
  AgentModuleDeps,
  AgentOrgContext,
  ProviderRow,
  RunEvent,
  RunLeg,
  RunRow,
  SessionRow,
  SessionTotalRow,
} from "./types.ts";

const NO_KEY = "unset";

const isTextAttachment = (attachment: AgentAttachment): boolean => {
  const extension = attachment.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    TEXT_ATTACHMENT_EXTENSIONS.includes(
      extension as (typeof TEXT_ATTACHMENT_EXTENSIONS)[number],
    ) || attachment.mediaType.startsWith("text/")
  );
};

const withAttachments = (
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

const fence = (block: { name: string; language: string; body: string }): string =>
  `\`\`\`${block.language}|${block.name}\n${block.body}\n\`\`\``;

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

const errorOf = (leg: RunLeg): string | null =>
  leg.failure === null
    ? leg.state === "failed"
      ? "provider_unknown: the answer never completed"
      : null
    : `${leg.failure.code}: ${leg.failure.message}`.slice(0, MAX_ERROR_LENGTH);

const pricingOf = (spec: string, model: string): AgentPricing | null => {
  const entry = catalogModel(spec, model);

  return entry === undefined
    ? null
    : {
        inputMicrosPerMillion: entry.priceInputMicrosPerMillion,
        outputMicrosPerMillion: entry.priceOutputMicrosPerMillion,
        cacheReadMicrosPerMillion: entry.priceCacheReadMicrosPerMillion,
      };
};

export function createAgentService(deps: AgentModuleDeps) {
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
    usage,
  } = deps;

  const keyOf = (row: ProviderRow | null): string => {
    if (row === null) return platformProvider?.apiKey ?? NO_KEY;
    return row.apiKeyCiphertext === null
      ? NO_KEY
      : decryptSecret(row.apiKeyCiphertext, encryptionKey);
  };

  const endpointOf = (row: ProviderRow | null) => ({
    spec: row?.spec ?? "custom",
    baseUrl: row?.baseUrl ?? platformProvider?.baseUrl ?? "",
    model: row?.model ?? platformProvider?.model ?? "",
    apiKey: keyOf(row),
    allowPrivateOutbound,
    maxRequestTokens: row?.maxRequestTokens ?? null,
  });

  const toView = (row: ProviderRow): AgentProviderView => ({
    id: row.id,
    name: row.name,
    spec: row.spec,
    baseUrl: row.baseUrl,
    model: row.model,
    hasKey: row.apiKeyCiphertext !== null,
    isDefault: row.isDefault,
    maxRequestTokens: row.maxRequestTokens,
    pricing: pricingOf(row.spec, row.model),
    createdAt: row.createdAt.toISOString(),
  });

  const toRunView = (row: RunRow): AgentRunView => ({
    id: row.id,
    providerId: row.providerId,
    model: row.model,
    prompt: row.prompt,
    output: row.output,
    status: row.status,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    costMicros: row.costMicros,
    durationMs: row.durationMs,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  });

  const toSessionView = (row: SessionTotalRow): AgentSessionView => ({
    id: row.id,
    gameId: row.gameId,
    projectId: row.projectId,
    title: row.title,
    pinned: row.pinned,
    runs: row.runs,
    costMicros: row.costMicros,
    updatedAt: row.updatedAt.toISOString(),
  });

  const toTurns = (row: RunRow): AgentTurnView[] => {
    const shared = {
      runId: row.id,
      model: row.model,
      status: row.status,
      costMicros: row.costMicros,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      durationMs: row.durationMs,
      createdAt: row.createdAt.toISOString(),
    } as const;

    const turns: AgentTurnView[] = [
      { ...shared, id: `${row.id}-user`, role: "user", text: row.prompt },
    ];

    if (row.output !== null) {
      turns.push({ ...shared, id: `${row.id}-assistant`, role: "assistant", text: row.output });
    }

    return turns;
  };

  const titleOf = (prompt: string): string => {
    const trimmed = prompt.trim().replace(/\s+/g, " ");

    return trimmed.length <= SESSION_TITLE_LENGTH
      ? trimmed
      : `${trimmed.slice(0, SESSION_TITLE_LENGTH - 1)}…`;
  };

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

  const toProjectView = (row: typeof agentProject.$inferSelect): AgentProjectView => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  });

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

  const totalsFor = async (
    scope: Scope,
    memberId: string,
    limit: number,
  ): Promise<SessionTotalRow[]> =>
    db
      .select({
        id: agentSession.id,
        organizationId: agentSession.organizationId,
        createdByMemberId: agentSession.createdByMemberId,
        gameId: agentSession.gameId,
        projectId: agentSession.projectId,
        title: agentSession.title,
        pinned: agentSession.pinned,
        createdAt: agentSession.createdAt,
        updatedAt: agentSession.updatedAt,
        runs: sql<number>`count(${agentRun.id})::int`,
        costMicros: sql<number>`coalesce(sum(${agentRun.costMicros}), 0)::int`,
      })
      .from(agentSession)
      .leftJoin(agentRun, eq(agentRun.sessionId, agentSession.id))
      .where(scopeTo(scope, agentSession, visibleTo(memberId)))
      .groupBy(agentSession.id)
      .orderBy(
        desc(agentSession.pinned),
        asc(agentSession.projectId),
        desc(agentSession.updatedAt),
        desc(agentSession.id),
      )
      .limit(limit);

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

  const clearDefault = (
    organizationId: string,
    tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
  ) =>
    tx
      .update(agentProvider)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(agentProvider.organizationId, organizationId));

  const systemOf = (
    org: AgentOrgContext,
    gameContext: AgentGameContext | null,
    mode: AgentRunMode,
  ): string =>
    `${DEFAULT_SYSTEM_PROMPT}\n${MODE_INSTRUCTIONS[mode]}\nThis chat runs inside the organization "${org.name}" (id ${org.id}, slug ${org.slug}). Use that organization directly; never ask the user to supply an organization id, slug, or name.` +
    (gameContext === null
      ? ""
      : `\nThis chat is bound to the game "${gameContext.name}" (id ${gameContext.id}, slug ${gameContext.slug}, hosting ${gameContext.hosting}, status ${gameContext.status}, current version ${gameContext.currentVersion ?? "none"}). deploy_game publishes to this game.`);

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

  return {
    async specs(): Promise<AgentSpecView[]> {
      return (await loadAgentCatalog()).map((spec) => ({
        id: spec.id,
        label: spec.name,
        baseUrl: spec.baseUrl,
        models: spec.models,
      }));
    },

    async listProviders(scope: Scope): Promise<AgentProviderView[]> {
      const rows = await db
        .select()
        .from(agentProvider)
        .where(scopeTo(scope, agentProvider))
        .orderBy(desc(agentProvider.isDefault), asc(agentProvider.createdAt));

      return rows.map(toView);
    },

    async createProvider(
      scope: Scope,
      memberId: string,
      body: CreateAgentProviderBody,
    ): Promise<AgentProviderView> {
      const baseUrl = await resolveBaseUrl(body.spec, body.baseUrl, allowPrivateOutbound);

      try {
        return await db.transaction(async (tx) => {
          if (body.isDefault ?? false) await clearDefault(scope.organizationId, tx);

          const [row] = await tx
            .insert(agentProvider)
            .values({
              id: newId(),
              organizationId: scope.organizationId,
              name: body.name,
              spec: body.spec,
              baseUrl,
              model: body.model,
              apiKeyCiphertext:
                body.apiKey === undefined
                  ? null
                  : encryptSecret(body.apiKey, encryptionKey),
              maxRequestTokens: body.maxRequestTokens ?? null,
              isDefault: body.isDefault ?? false,
              createdByMemberId: memberId,
            })
            .returning();

          if (row === undefined) throw new NotFoundError("agent provider not found");

          return toView(row);
        });
      } catch (caught) {
        if (isUniqueViolation(caught)) {
          throw new ConflictError("this workspace already has a provider with that name");
        }
        throw caught;
      }
    },

    async updateProvider(
      scope: Scope,
      providerId: string,
      body: UpdateAgentProviderBody,
    ): Promise<AgentProviderView> {
      const current = await readProvider(scope, providerId);

      await db.transaction(async (tx) => {
        if (body.isDefault ?? false) await clearDefault(scope.organizationId, tx);

        await tx
          .update(agentProvider)
          .set({
            model: body.model,
            baseUrl:
              body.baseUrl === undefined
                ? undefined
                : await resolveBaseUrl(current.spec, body.baseUrl, allowPrivateOutbound),
            apiKeyCiphertext:
              body.apiKey === undefined
                ? undefined
                : encryptSecret(body.apiKey, encryptionKey),
            maxRequestTokens: body.maxRequestTokens,
            isDefault: body.isDefault,
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, agentProvider, eq(agentProvider.id, providerId)));
      });

      return toView(await readProvider(scope, providerId));
    },

    async deleteProvider(scope: Scope, providerId: string): Promise<void> {
      await readProvider(scope, providerId);

      await db
        .delete(agentProvider)
        .where(scopeTo(scope, agentProvider, eq(agentProvider.id, providerId)));
    },

    async listSessions(scope: Scope, memberId: string): Promise<AgentSessionView[]> {
      const rows = await totalsFor(scope, memberId, RECENT_SESSIONS_LIMIT);

      return rows.map(toSessionView);
    },

    async listProjects(scope: Scope, memberId: string): Promise<AgentProjectView[]> {
      const rows = await db
        .select()
        .from(agentProject)
        .where(scopeTo(scope, agentProject, projectVisibleTo(memberId)))
        .orderBy(desc(agentProject.updatedAt), desc(agentProject.id));

      return rows.map(toProjectView);
    },

    async createProject(
      scope: Scope,
      memberId: string,
      body: CreateAgentProjectBody,
    ): Promise<AgentProjectView> {
      const [row] = await db
        .insert(agentProject)
        .values({
          organizationId: scope.organizationId,
          createdByMemberId: memberId,
          name: body.name,
        })
        .returning();

      if (row === undefined) throw new NotFoundError("agent project not found");

      return toProjectView(row);
    },

    async renameProject(
      scope: Scope,
      memberId: string,
      projectId: string,
      body: RenameAgentProjectBody,
    ): Promise<AgentProjectView> {
      await readProject(scope, memberId, projectId);

      const [row] = await db
        .update(agentProject)
        .set({ name: body.name, updatedAt: new Date() })
        .where(eq(agentProject.id, projectId))
        .returning();

      if (row === undefined) throw new NotFoundError("agent project not found");

      return toProjectView(row);
    },

    async deleteProject(scope: Scope, memberId: string, projectId: string): Promise<void> {
      await readProject(scope, memberId, projectId);

      await db
        .update(agentSession)
        .set({ projectId: null })
        .where(eq(agentSession.projectId, projectId));

      await db.delete(agentProject).where(eq(agentProject.id, projectId));
    },

    async createSession(
      scope: Scope,
      memberId: string,
      body: CreateAgentSessionBody,
    ): Promise<AgentSessionView> {
      const projectId = body.projectId ?? null;

      if (projectId !== null) {
        await readProject(scope, memberId, projectId);
      }

      const row = await newSession(
        scope,
        memberId,
        body.title ?? NEW_SESSION_TITLE,
        body.gameId ?? null,
        projectId,
      );

      return toSessionView({ ...row, runs: 0, costMicros: 0 });
    },

    async updateSession(
      scope: Scope,
      memberId: string,
      sessionId: string,
      body: UpdateAgentSessionBody,
    ): Promise<AgentSessionView> {
      const current = await readSession(scope, memberId, sessionId);
      const title = body.title ?? current.title;
      const projectId = body.projectId === undefined ? current.projectId : body.projectId;

      if (projectId !== null && projectId !== current.projectId) {
        await readProject(scope, memberId, projectId);
      }

      if (body.title !== undefined && body.title !== current.title) {
        await runtime.memory.updateThread({ id: sessionId, title: body.title });
      }

      const [row] = await db
        .update(agentSession)
        .set({
          title,
          pinned: body.pinned ?? current.pinned,
          projectId,
          updatedAt: current.updatedAt,
        })
        .where(scopeTo(scope, agentSession, eq(agentSession.id, sessionId)))
        .returning();

      if (row === undefined) throw new NotFoundError("agent session not found");

      return toSessionView({ ...row, runs: 0, costMicros: 0 });
    },

    async deleteSession(scope: Scope, memberId: string, sessionId: string): Promise<void> {
      await readSession(scope, memberId, sessionId);

      await runtime.memory.deleteThread(sessionId);

      await db
        .delete(agentSession)
        .where(scopeTo(scope, agentSession, eq(agentSession.id, sessionId)));
    },

    async messages(
      scope: Scope,
      memberId: string,
      sessionId: string,
    ): Promise<AgentTurnView[]> {
      await readSession(scope, memberId, sessionId);

      const rows = await db
        .select()
        .from(agentRun)
        .where(scopeTo(scope, agentRun, eq(agentRun.sessionId, sessionId)))
        .orderBy(asc(agentRun.createdAt));

      return rows.flatMap(toTurns);
    },

    async models(
      scope: Scope,
      input: { spec?: string; baseUrl?: string; apiKey?: string; providerId?: string },
    ): Promise<string[]> {
      if (input.providerId !== undefined) {
        const row = await readProvider(scope, input.providerId);
        return listModels(endpointOf(row));
      }

      if (input.spec === undefined) {
        throw new BadRequestError("a provider or a provider spec is required");
      }

      return listModels({
        spec: input.spec,
        baseUrl: await resolveBaseUrl(input.spec, input.baseUrl, allowPrivateOutbound),
        model: "",
        apiKey: input.apiKey ?? NO_KEY,
        allowPrivateOutbound,
      });
    },

    async listRuns(scope: Scope, limit: number): Promise<AgentRunView[]> {
      const rows = await db
        .select()
        .from(agentRun)
        .where(scopeTo(scope, agentRun))
        .orderBy(desc(agentRun.createdAt))
        .limit(limit);

      return rows.map(toRunView);
    },

    async spend(scope: Scope, days: number) {
      const from = new Date(Date.now() - (days - 1) * 86_400_000);
      from.setUTCHours(0, 0, 0, 0);

      const scopedTo = sql`organization_id = ${scope.organizationId}
            and created_at >= ${from.toISOString()}::timestamptz`;

      const [rows, priced] = await Promise.all([
        db.execute<{ day: string; runs: number; cost_micros: string | number }>(sql`
          select
            to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
            count(*)::int as runs,
            coalesce(sum(cost_micros), 0)::bigint as cost_micros
          from agent_run
          where ${scopedTo}
          group by day
          order by day
        `),
        db.execute<{
          model: string;
          runs: number;
          prompt_tokens: string | number;
          completion_tokens: string | number;
          cost_micros: string | number;
          avg_duration_ms: number;
        }>(sql`
          select
            model,
            count(*)::int as runs,
            coalesce(sum(prompt_tokens), 0)::bigint as prompt_tokens,
            coalesce(sum(completion_tokens), 0)::bigint as completion_tokens,
            coalesce(sum(cost_micros), 0)::bigint as cost_micros,
            coalesce(round(avg(duration_ms)), 0)::int as avg_duration_ms
          from agent_run
          where ${scopedTo}
          group by model
          order by cost_micros desc, model
        `),
      ]);

      const byDay = new Map(rows.map((row) => [row.day, row]));
      const daily: { date: string; runs: number; costMicros: number }[] = [];
      const cursor = new Date(from);

      for (let index = 0; index < days; index += 1) {
        const date = cursor.toISOString().slice(0, 10);
        const row = byDay.get(date);

        daily.push({
          date,
          runs: Number(row?.runs ?? 0),
          costMicros: Number(row?.cost_micros ?? 0),
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      const models = priced.map((row) => ({
        model: row.model,
        runs: Number(row.runs),
        promptTokens: Number(row.prompt_tokens),
        completionTokens: Number(row.completion_tokens),
        costMicros: Number(row.cost_micros),
        avgDurationMs: Number(row.avg_duration_ms),
      }));

      return {
        runs: models.reduce((sum, row) => sum + row.runs, 0),
        promptTokens: models.reduce((sum, row) => sum + row.promptTokens, 0),
        completionTokens: models.reduce((sum, row) => sum + row.completionTokens, 0),
        costMicros: models.reduce((sum, row) => sum + row.costMicros, 0),
        daily,
        models,
      };
    },

    async *run(
      scope: Scope,
      memberId: string,
      userId: string,
      body: RunAgentBody,
      requestId: string,
    ): AsyncGenerator<RunEvent, void, void> {
      const provider = await chosen(scope, body.providerId);
      const endpoint = endpointOf(provider);
      const startedAt = performance.now();
      const runId = newId();
      const log = logOf(requestId, scope, runId);
      const assembled = withAttachments(body.prompt, body.attachments);
      const mode = body.mode ?? "agent";

      const session =
        body.sessionId === undefined
          ? await newSession(scope, memberId, titleOf(assembled.prompt), body.gameId ?? null, null)
          : await readSession(scope, memberId, body.sessionId);

      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      const tools = toolsFor(scope, { memberId, userId }, runId, session.gameId, log);
      const activeTools = mode === "plan" ? [...READ_ONLY_TOOL_NAMES] : undefined;

      const leg = yield* collectLeg(
        runAgent({
          runtime,
          endpoint,
          instructions: systemOf(await readOrg(scope), gameContext, mode),
          agentRunId: runId,
          requestId,
          prompt: assembled.prompt,
          attachments: assembled.others,
          tools,
          activeTools,
          thread: session.id,
          resource: `${scope.organizationId}:${memberId}`,
        }),
      );

      const durationMs = Math.round(performance.now() - startedAt);
      const costMicros = estimateCostMicros(
        catalogModel(endpoint.spec, endpoint.model),
        leg,
      );

      await db.insert(agentRun).values({
        id: runId,
        organizationId: scope.organizationId,
        sessionId: session.id,
        providerId: provider?.id ?? null,
        createdByMemberId: memberId,
        createdByUserId: userId,
        model: endpoint.model,
        prompt: assembled.prompt,
        output: leg.state === "failed" && leg.output === "" ? null : leg.output,
        status: leg.state,
        promptTokens: leg.promptTokens,
        completionTokens: leg.completionTokens,
        costMicros,
        durationMs,
        error: errorOf(leg),
      });

      await touchSession(session.id);

      await usage.incr({
        organizationId: scope.organizationId,
        platformId: null,
        metric: "ai_runs",
      });

      if (costMicros > 0) {
        await usage.incr({
          organizationId: scope.organizationId,
          platformId: null,
          metric: "ai_cost_micros",
          amount: costMicros,
        });
      }

      if (leg.state === "failed") {
        logFailure(scope, runId, provider, endpoint.model, leg.failure);

        yield {
          kind: "error",
          code: leg.failure?.code ?? "provider_unknown",
          message: leg.failure?.message ?? "the answer never completed",
          retryable: leg.failure?.retryable ?? false,
        };

        return;
      }

      if (leg.state === "awaiting_approval") return;

      yield {
        kind: "done",
        runId,
        sessionId: session.id,
        model: endpoint.model,
        costMicros,
        promptTokens: leg.promptTokens,
        completionTokens: leg.completionTokens,
        durationMs,
        trimmedMessages: leg.trimmedMessages,
      };
    },

    async pending(
      scope: Scope,
      memberId: string,
      userId: string,
      sessionId: string,
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

      const session = await readSession(scope, memberId, sessionId);
      const provider =
        row.providerId === null ? null : await readProvider(scope, row.providerId);
      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      return pendingApprovals({
        runtime,
        endpoint: endpointOf(provider),
        instructions: systemOf(await readOrg(scope), gameContext, "agent"),
        tools: toolsFor(scope, { memberId, userId }, row.id, session.gameId),
        thread: session.id,
        resource: `${scope.organizationId}:${memberId}`,
      });
    },

    async *approve(
      scope: Scope,
      memberId: string,
      userId: string,
      body: ApproveAgentRunBody,
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

      const session = await readSession(scope, memberId, row.sessionId);
      const provider =
        row.providerId === null ? null : await readProvider(scope, row.providerId);
      const endpoint = endpointOf(provider);
      const startedAt = performance.now();

      const gameContext =
        session.gameId === null ? null : await games.context(scope, session.gameId);

      const leg = yield* collectLeg(
        resumeAgentRun({
          runtime,
          endpoint,
          instructions: systemOf(await readOrg(scope), gameContext, "agent"),
          agentRunId: row.id,
          callId: body.callId,
          approved: body.approved,
          tools: toolsFor(scope, { memberId, userId }, row.id, session.gameId),
        }),
      );

      const durationMs = row.durationMs + Math.round(performance.now() - startedAt);
      const promptTokens = row.promptTokens + leg.promptTokens;
      const completionTokens = row.completionTokens + leg.completionTokens;
      const costMicros =
        row.costMicros +
        estimateCostMicros(catalogModel(endpoint.spec, endpoint.model), leg);
      const output = [row.output, leg.output].filter((part) => part !== "").join("\n");

      await db
        .update(agentRun)
        .set({
          status: leg.state,
          output: leg.state === "failed" && output === "" ? null : output,
          promptTokens,
          completionTokens,
          costMicros,
          durationMs,
          error: errorOf(leg),
        })
        .where(eq(agentRun.id, row.id));

      await touchSession(session.id);

      if (costMicros > row.costMicros) {
        await usage.incr({
          organizationId: scope.organizationId,
          platformId: null,
          metric: "ai_cost_micros",
          amount: costMicros - row.costMicros,
        });
      }

      if (leg.state === "failed") {
        logFailure(scope, row.id, provider, endpoint.model, leg.failure);

        yield {
          kind: "error",
          code: leg.failure?.code ?? "provider_unknown",
          message: leg.failure?.message ?? "the answer never completed",
          retryable: leg.failure?.retryable ?? false,
        };

        return;
      }

      if (leg.state === "awaiting_approval") return;

      yield {
        kind: "done",
        runId: row.id,
        sessionId: session.id,
        model: endpoint.model,
        costMicros,
        promptTokens,
        completionTokens,
        durationMs,
        trimmedMessages: leg.trimmedMessages,
      };
    },
  };
}
