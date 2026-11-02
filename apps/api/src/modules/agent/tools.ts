import { createTool } from "@mastra/core/tools";
import { toStandardSchema } from "@mastra/core/schema";
import type { Static } from "@sinclair/typebox";
import { t } from "elysia";
import {
  CreateApiKeyBody,
  CreateGameBody,
  CreatePlatformBody,
  CreateTournamentBody,
} from "@wasanni/contracts";
import type { AuditAction, AuditResourceType } from "@wasanni/contracts";
import type { Logger, Scope } from "@wasanni/kit";
import { findDoc, readDocs } from "../docs/index.ts";
import { failureOf } from "../../failures.ts";
import type { AuditService } from "../audit/types.ts";
import type { AgentGamePort, AgentIntegrator } from "./types.ts";

export type AgentActor = { readonly memberId: string; readonly userId: string };

type WriteContext = {
  scope: Scope;
  actor: AgentActor;
  agentRunId: string;
  audit: AuditService;
};

const auditWrite = (
  { scope, actor, agentRunId, audit }: WriteContext,
  tool: string,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string,
): Promise<void> =>
  audit.record({
    organizationId: scope.organizationId,
    actor: { type: "user", userId: actor.userId },
    source: "agent",
    action,
    resourceType,
    resourceId,
    metadata: { agentRunId, via: "ai", tool },
  });

type Operation = { summary?: string; description?: string };

type Document = {
  paths?: Record<string, Record<string, Operation>>;
};

const MAX_INDEX_CHARS = 16_000;

const MAX_DOC_CHARS = 20_000;

const PLATFORM_CREDENTIAL = "(platform api key)";

const platformKeyed = (operations: Record<string, Operation> | undefined): boolean =>
  Object.values(operations ?? {}).some((operation) =>
    (operation.summary ?? operation.description ?? "").includes(PLATFORM_CREDENTIAL),
  );

const routeKey = (route: string): string =>
  route.replace(/\{([^}]+)\}/g, ":$1").replace(/:[^/]+/g, ":");

const apiDocsInput = t.Object({ path: t.Optional(t.String()) });

const integrationGuideInput = t.Object({ slug: t.Optional(t.String({ maxLength: 40 })) });

const emptyInput = t.Object({});

const deployGameInput = t.Object({ html: t.String({ maxLength: 2_000_000 }) });

const tournamentIdInput = t.Object({ tournamentId: t.String({ minLength: 1, maxLength: 64 }) });

const matchIdInput = t.Object({ matchId: t.String({ minLength: 1, maxLength: 64 }) });

const participantInput = t.Object({
  platformId: t.String({ minLength: 1, maxLength: 64 }),
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
  displayName: t.Optional(t.String({ maxLength: 200 })),
});

const registerPlayerInput = t.Object({
  tournamentId: t.String({ minLength: 1, maxLength: 64 }),
  ...participantInput.properties,
});

const startDuelInput = t.Object({
  gameId: t.String({ minLength: 1, maxLength: 64 }),
  name: t.Optional(t.String({ maxLength: 120 })),
  players: t.Array(participantInput, { minItems: 2, maxItems: 2 }),
});

const completeMatchInput = t.Object({
  matchId: t.String({ minLength: 1, maxLength: 64 }),
  winnerParticipantId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  winner: t.Optional(
    t.Object({
      platformId: t.String({ minLength: 1, maxLength: 64 }),
      externalUserId: t.String({ minLength: 1, maxLength: 200 }),
    }),
  ),
});

const recordScoreInput = t.Object({
  sessionId: t.String({ minLength: 1, maxLength: 64 }),
  score: t.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  endSession: t.Optional(t.Boolean()),
});

const readLeaderboardInput = t.Object({
  gameId: t.String({ minLength: 1, maxLength: 64 }),
  platformId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  mode: t.Optional(t.String({ maxLength: 80 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
  includeFlagged: t.Optional(t.Boolean()),
});

const gameIdInput = t.Object({ gameId: t.String({ minLength: 1, maxLength: 64 }) });

const createAssignmentInput = t.Object({
  gameId: t.String({ minLength: 1, maxLength: 64 }),
  platformId: t.String({ minLength: 1, maxLength: 64 }),
});

const listTournamentsInput = t.Object({
  gameId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

const guarded = async <T>(
  log: Logger,
  tool: string,
  run: () => Promise<T>,
): Promise<T | string> => {
  try {
    return await run();
  } catch (caught) {
    const failure = failureOf(caught);
    log.warn("agent.tool_failed", { tool, code: failure.source.code });
    return failure.source.message;
  }
};

const writeTool = (
  ctx: WriteContext,
  log: Logger,
  meta: { tool: string; action: AuditAction; resourceType: AuditResourceType },
  run: () => Promise<{ id: string; text: string }>,
): Promise<string> =>
  guarded(log, meta.tool, async () => {
    const { id, text } = await run();

    await auditWrite(ctx, meta.tool, meta.action, meta.resourceType, id);

    return text;
  });

export const createApiDocsTool = (input: {
  api: { handle(request: Request): Response | Promise<Response> };
  docsJsonPath: string;
}) => {
  let cached: Promise<Document> | undefined;

  const document = (): Promise<Document> => {
    if (cached === undefined) {
      cached = Promise.resolve(
        input.api.handle(new Request(`http://wasanni.internal${input.docsJsonPath}`)),
      ).then((response) => response.json() as Promise<Document>);
    }

    return cached;
  };

  const apiDocs = async (path?: string): Promise<string> => {
    const doc = await document();

    if (path !== undefined) {
      const wanted = routeKey(path);
      const item = Object.entries(doc.paths ?? {}).find(
        ([key]) => routeKey(key) === wanted,
      );

      return item === undefined
        ? `no documented path matches ${path}`
        : JSON.stringify({ [item[0]]: item[1] }, null, 2).slice(0, MAX_DOC_CHARS);
    }

    const lines = Object.entries(doc.paths ?? {})
      .sort(
        ([, left], [, right]) =>
          Number(platformKeyed(right)) - Number(platformKeyed(left)),
      )
      .flatMap(([key, item]) =>
        Object.entries(item).map(
          ([method, operation]) =>
            `${method.toUpperCase()} ${key} — ${operation.summary ?? operation.description?.split("\n")[0] ?? ""}`.trimEnd(),
        ),
      );

    return lines.join("\n").slice(0, MAX_INDEX_CHARS);
  };

  return {
    api_docs: createTool({
      id: "api_docs",
      description:
        "Endpoints of the Wasanni API this game integrates with. Without a path it lists every METHOD /path; with a path it returns that path's full request and response schemas.",
      inputSchema: toStandardSchema<Static<typeof apiDocsInput>>(apiDocsInput),
      execute: async ({ path }) => apiDocs(path),
    }),
  };
};

export const createGuideTool = () => ({
  integration_guide: createTool({
    id: "integration_guide",
    description:
      "The written integration guides: start-to-finish how-tos for api keys, sessions, scores, leaderboards, realtime, webhooks, tournaments and matches. Without a slug it lists the slugs; with one it returns that guide.",
    inputSchema: toStandardSchema<Static<typeof integrationGuideInput>>(integrationGuideInput),
    execute: async ({ slug }) => {
      if (slug === undefined) {
        const lines = (await readDocs()).map(
          (doc) => `- ${doc.slug}: ${doc.title} — ${doc.summary}`,
        );

        return lines.join("\n").slice(0, MAX_INDEX_CHARS);
      }

      const doc = await findDoc(slug);

      return doc === undefined
        ? `no integration guide is stored under ${slug}`
        : doc.markdown.slice(0, MAX_DOC_CHARS);
    },
  }),
});

export const createGameTools = (input: WriteContext & {
  games: AgentGamePort;
  gameId: string | null;
  log: Logger;
}) => {
  const { games, scope, actor, agentRunId, audit, log, gameId } = input;
  const ctx = { scope, actor, agentRunId, audit };

  return {
    list_games: createTool({
      id: "list_games",
      description:
        "The games of this organization with their hosting, status, and current version.",
      inputSchema: toStandardSchema<Static<typeof emptyInput>>(emptyInput),
      execute: async () => games.list(scope),
    }),
    deploy_game: createTool({
      id: "deploy_game",
      description:
        "Publish an HTML file as the current version of the game bound to this chat and make it live. Requires the chat to be bound to a hosted game.",
      inputSchema: toStandardSchema<Static<typeof deployGameInput>>(deployGameInput),
      requireApproval: true,
      execute: async ({ html }) => {
        if (gameId === null) {
          return "this chat is not bound to a game; ask the user to pick one in the chat header";
        }

        if (html === "") {
          return "deploy_game needs the complete html of the game";
        }

        return writeTool(
          ctx,
          log,
          { tool: "deploy_game", action: "game.updated", resourceType: "game" },
          async () => {
            const version = await games.deploy(scope, actor.memberId, gameId, html);

            return { id: gameId, text: `deployed version ${version}` };
          },
        );
      },
    }),
    create_game: createTool({
      id: "create_game",
      description:
        "Create a game in this organization. Create it here first, then deploy_game publishes its html once the chat is bound to it.",
      inputSchema: toStandardSchema<CreateGameBody>(CreateGameBody),
      requireApproval: true,
      execute: (body) =>
        writeTool(
          ctx,
          log,
          { tool: "create_game", action: "game.created", resourceType: "game" },
          async () => {
            const game = await games.create(scope, body);

            return {
              id: game.id,
              text: `created game ${game.id} (${game.name}, ${game.hosting}, ${game.status})`,
            };
          },
        ),
    }),
  };
};

export const createIntegratorTools = (
  input: { integrator: AgentIntegrator; log: Logger } & WriteContext,
) => {
  const { integrator, scope, actor, agentRunId, audit, log } = input;
  const ctx = { scope, actor, agentRunId, audit };

  return {
    list_platforms: createTool({
      id: "list_platforms",
      description:
        "The platforms of this organization. Sessions, scores, leaderboards and tournament registrations each name one of these ids.",
      inputSchema: toStandardSchema<Static<typeof emptyInput>>(emptyInput),
      execute: async () => integrator.platforms.list(scope),
    }),
    read_match: createTool({
      id: "read_match",
      description:
        "One match with its participants: slots, scores, outcomes and participant ids.",
      inputSchema: toStandardSchema<Static<typeof matchIdInput>>(matchIdInput),
      execute: async ({ matchId }) =>
        guarded(log, "read_match", async () => ({
          match: await integrator.matches.get(scope, matchId),
          participants: await integrator.matches.listParticipants(scope, matchId),
        })),
    }),
    read_leaderboard: createTool({
      id: "read_leaderboard",
      description:
        "The best accepted score per player for one game, highest first; without a platformId the board spans every platform of the organization.",
      inputSchema: toStandardSchema<Static<typeof readLeaderboardInput>>(readLeaderboardInput),
      execute: async (query) =>
        guarded(log, "read_leaderboard", async () => {
          const { entries } = await integrator.leaderboards.list(scope, query.gameId, {
            ...(query.platformId === undefined ? {} : { platformId: query.platformId }),
            ...(query.mode === undefined ? {} : { mode: query.mode }),
            ...(query.limit === undefined ? {} : { limit: query.limit }),
            ...(query.includeFlagged === undefined
              ? {}
              : { includeFlagged: query.includeFlagged }),
          });
          return entries;
        }),
    }),
    read_tournament_standings: createTool({
      id: "read_tournament_standings",
      description:
        "Standings of a tournament: the bracket round by round for a bracket tournament, the best score per player for a leaderboard one.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      execute: async ({ tournamentId }) =>
        guarded(log, "read_tournament_standings", () =>
          integrator.standings.read(scope, tournamentId),
        ),
    }),
    create_tournament: createTool({
      id: "create_tournament",
      description:
        "Create a tournament in draft for a game of this organization, with format leaderboard or bracket and a slug unique in the organization. Open it before players can register.",
      inputSchema: toStandardSchema<CreateTournamentBody>(CreateTournamentBody),
      requireApproval: true,
      execute: (body) =>
        writeTool(ctx, log, { tool: "create_tournament", action: "tournament.created", resourceType: "tournament" }, async () => {
          const tournament = await integrator.tournaments.create(scope, { body });

          return {
            id: tournament.id,
            text: `created tournament ${tournament.id} (${tournament.name}, ${tournament.format}, ${tournament.status})`,
          };
        }),
    }),
    open_tournament: createTool({
      id: "open_tournament",
      description: "Open a draft tournament so players can register for it.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      requireApproval: true,
      execute: ({ tournamentId }) =>
        writeTool(ctx, log, { tool: "open_tournament", action: "tournament.updated", resourceType: "tournament" }, async () => {
          const tournament = await integrator.tournaments.open(scope, tournamentId);

          return { id: tournament.id, text: `tournament ${tournament.id} is ${tournament.status}` };
        }),
    }),
    register_player: createTool({
      id: "register_player",
      description: "Register one player of a platform in a tournament that is open.",
      inputSchema: toStandardSchema<Static<typeof registerPlayerInput>>(registerPlayerInput),
      requireApproval: true,
      execute: (player) =>
        writeTool(ctx, log, { tool: "register_player", action: "participant.created", resourceType: "participant" }, async () => {
          const participant = await integrator.participants.register(scope, {
            tournamentId: player.tournamentId,
            platformId: player.platformId,
            externalUserId: player.externalUserId,
            ...(player.displayName === undefined
              ? {}
              : { displayName: player.displayName }),
          });

          return {
            id: participant.id,
            text: `registered ${participant.id} for ${player.externalUserId} in tournament ${player.tournamentId}`,
          };
        }),
    }),
    seed_tournament: createTool({
      id: "seed_tournament",
      description:
        "Seed the bracket of an open bracket tournament from its registered players and start it. Needs at least two registered players.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      requireApproval: true,
      execute: ({ tournamentId }) =>
        writeTool(ctx, log, { tool: "seed_tournament", action: "tournament.updated", resourceType: "tournament" }, async () => {
          const bracket = await integrator.brackets.generateBracket(scope, tournamentId);

          return {
            id: tournamentId,
            text: `seeded a bracket of ${bracket.bracketSize} slots over ${bracket.totalRounds} rounds`,
          };
        }),
    }),
    cancel_tournament: createTool({
      id: "cancel_tournament",
      description: "Cancel a tournament that has not completed.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      requireApproval: true,
      execute: ({ tournamentId }) =>
        writeTool(ctx, log, { tool: "cancel_tournament", action: "tournament.cancelled", resourceType: "tournament" }, async () => {
          const tournament = await integrator.tournaments.cancel(scope, tournamentId);

          return { id: tournament.id, text: `tournament ${tournament.id} is ${tournament.status}` };
        }),
    }),
    start_duel: createTool({
      id: "start_duel",
      description:
        "Create a match of exactly two players on one game. The answer lists both participant ids, which complete_match needs to name a winner.",
      inputSchema: toStandardSchema<Static<typeof startDuelInput>>(startDuelInput),
      requireApproval: true,
      execute: ({ gameId, name, players }) =>
        writeTool(ctx, log, { tool: "start_duel", action: "match.created", resourceType: "match" }, async () => {
          const match = await integrator.matches.create(scope, {
            body: { gameId, participants: players, ...(name === undefined ? {} : { name }) },
          });

          const seated = await integrator.matches.listParticipants(scope, match.id);

          const sides = seated.map((entry) => `${entry.id}=${entry.externalUserId}`).join(" versus ");

          return { id: match.id, text: `created match ${match.id} (${match.status}): ${sides}` };
        }),
    }),
    complete_match: createTool({
      id: "complete_match",
      description:
        "Close a match by naming its winner, either with a participant id from start_duel or read_match, or with the winner's platformId and externalUserId.",
      inputSchema: toStandardSchema<Static<typeof completeMatchInput>>(completeMatchInput),
      requireApproval: true,
      execute: ({ matchId, winnerParticipantId, winner }) =>
        writeTool(ctx, log, { tool: "complete_match", action: "match.updated", resourceType: "match" }, async () => {
          const match = await integrator.matches.complete(scope, {
            matchId,
            ...(winnerParticipantId === undefined ? {} : { winnerParticipantId }),
            ...(winner === undefined ? {} : { winnerExternal: winner }),
          });

          return {
            id: match.id,
            text: `match ${match.id} is ${match.status}, winner ${match.winnerParticipantId ?? "none — drawn"}`,
          };
        }),
    }),
    record_score: createTool({
      id: "record_score",
      description:
        "Record a score for a game session from the server side. The answer is the stored score with its status, flags and verification outcome, so a flagged or refused score is visible.",
      inputSchema: toStandardSchema<Static<typeof recordScoreInput>>(recordScoreInput),
      requireApproval: true,
      execute: ({ sessionId, score, endSession }) =>
        writeTool(ctx, log, { tool: "record_score", action: "score.created", resourceType: "score" }, async () => {
          const view = await integrator.scores.submitFromServer(scope, {
            sessionId,
            body: { score, ...(endSession === undefined ? {} : { endSession }) },
          });

          return {
            id: view.id,
            text: `recorded ${view.score} as ${view.status}, verification ${view.verificationStatus}, flags ${view.flags.join(", ") || "none"}`,
          };
        }),
    }),
    create_platform: createTool({
      id: "create_platform",
      description:
        "Create a platform in this organization. A platform is one place the organization's games are used, and sessions and leaderboards name one of its ids.",
      inputSchema: toStandardSchema<CreatePlatformBody>(CreatePlatformBody),
      requireApproval: true,
      execute: (body) =>
        writeTool(ctx, log, { tool: "create_platform", action: "platform.created", resourceType: "platform" }, async () => {
          const platform = await integrator.platforms.create(scope, body);

          return {
            id: platform.id,
            text: `created platform ${platform.id} (${platform.name}, ${platform.slug})`,
          };
        }),
    }),
    list_tournaments: createTool({
      id: "list_tournaments",
      description: "The tournaments of this organization, optionally filtered to one game.",
      inputSchema: toStandardSchema<Static<typeof listTournamentsInput>>(listTournamentsInput),
      execute: async ({ gameId }) =>
        guarded(log, "list_tournaments", () =>
          integrator.tournaments.list(scope, gameId === undefined ? {} : { gameId }),
        ),
    }),
    read_tournament: createTool({
      id: "read_tournament",
      description:
        "One tournament with its game id, game name, format, status and timings.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      execute: async ({ tournamentId }) =>
        guarded(log, "read_tournament", () =>
          integrator.tournaments.get(scope, tournamentId),
        ),
    }),
    create_assignment: createTool({
      id: "create_assignment",
      description:
        "Assign a game to one platform. A game takes sessions only on platforms it is assigned to.",
      inputSchema: toStandardSchema<Static<typeof createAssignmentInput>>(createAssignmentInput),
      requireApproval: true,
      execute: (input) =>
        writeTool(ctx, log, { tool: "create_assignment", action: "assignment.created", resourceType: "assignment" }, async () => {
          const assignment = await integrator.assignments.create(scope, {
            ...input,
            memberId: actor.memberId,
          });

          return {
            id: assignment.id,
            text: `assigned game ${assignment.gameId} to platform ${assignment.platformId} (${assignment.id})`,
          };
        }),
    }),
    list_assignments: createTool({
      id: "list_assignments",
      description: "The platforms one game is assigned to.",
      inputSchema: toStandardSchema<Static<typeof gameIdInput>>(gameIdInput),
      execute: async ({ gameId }) =>
        guarded(log, "list_assignments", () =>
          integrator.assignments.listByGame(scope, gameId),
        ),
    }),
    create_api_key: createTool({
      id: "create_api_key",
      description:
        "Issue an api key for this organization. scope organization (sk_org_) is for MCP and the agent; scope platform (sk_plt_) with a platformId is for one platform's game server. The key value is returned exactly once and is never stored.",
      inputSchema: toStandardSchema<CreateApiKeyBody>(CreateApiKeyBody),
      requireApproval: true,
      execute: (body) =>
        writeTool(ctx, log, { tool: "create_api_key", action: "key.created", resourceType: "key" }, async () => {
          const key = await integrator.apiKeys.create(scope, actor.userId, body);

          return {
            id: key.id,
            text: `created ${key.scope} api key ${key.id} (prefix ${key.prefix}). key: ${key.key}`,
          };
        }),
    }),
  };
};

export const createAgentTools = (input: {
  api: { handle(request: Request): Response | Promise<Response> };
  docsJsonPath: string;
  games: AgentGamePort;
  integrator: AgentIntegrator;
  scope: Scope;
  actor: AgentActor;
  agentRunId: string;
  gameId: string | null;
  log: Logger;
  audit: AuditService;
}) => ({
  ...createApiDocsTool(input),
  ...createGuideTool(),
  ...createGameTools(input),
  ...createIntegratorTools(input),
});
