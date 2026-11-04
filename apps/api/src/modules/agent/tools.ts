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

const routeKey = (route: string): string =>
  route.replace(/\{([^}]+)\}/g, ":$1").replace(/:[^/]+/g, ":");

const apiDocsInput = t.Object({ path: t.Optional(t.String()) });

const integrationGuideInput = t.Object({ slug: t.Optional(t.String({ maxLength: 40 })) });

const emptyInput = t.Object({});

const deployGameInput = t.Object({
  html: t.String({ maxLength: 2_000_000 }),
  platformId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

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
      const entries = Object.entries(doc.paths ?? {});
      const item = entries.find(([key]) => routeKey(key) === wanted);

      if (item !== undefined) {
        return JSON.stringify({ [item[0]]: item[1] }, null, 2);
      }

      const tail = path.split("/").filter(Boolean).at(-1) ?? "";
      const near = entries
        .filter(([key]) => key.split("/").filter(Boolean).at(-1) === tail)
        .map(([key]) => key)
        .slice(0, 8);

      return near.length === 0
        ? `no documented path matches ${path}`
        : `no documented path matches ${path}. Paths ending in ${tail}: ${near.join(", ")}`;
    }

    const lines = Object.entries(doc.paths ?? {})
      .flatMap(([key, item]) =>
        Object.entries(item).map(
          ([method, operation]) =>
            `${method.toUpperCase()} ${key}: ${operation.summary ?? operation.description?.split("\n")[0] ?? ""}`.trimEnd(),
        ),
      );

    const listed: string[] = [];
    let chars = 0;

    for (const line of lines) {
      if (chars + line.length + 1 > MAX_INDEX_CHARS) break;
      listed.push(line);
      chars += line.length + 1;
    }

    const endNote = (missing: number): string =>
      missing === 0
        ? ""
        : `\n… plus ${missing} more endpoints, each readable by passing its path.`;

    let missing = lines.length - listed.length;

    while (missing > 0 && listed.join("\n").length + endNote(missing).length > MAX_INDEX_CHARS) {
      listed.pop();
      missing += 1;
    }

    return listed.join("\n") + endNote(missing);
  };

  return {
    api_docs: createTool({
      id: "api_docs",
      description:
        "Ground truth for the Wasanni API. Call it before naming any endpoint, header, or payload. Without a path it lists every METHOD /path with a one-line summary; with a path it returns that path's full request and response schemas. When a lookup misses it suggests the closest real paths, so use one of those instead of guessing.",
      inputSchema: toStandardSchema<Static<typeof apiDocsInput>>(apiDocsInput),
      execute: async ({ path }) => apiDocs(path),
    }),
  };
};

export const createGuideTool = () => ({
  integration_guide: createTool({
    id: "integration_guide",
    description:
      "Start-to-finish how-tos for api keys, sessions, scores, leaderboards, realtime, webhooks, tournaments and matches. Read the slug that matches the task before explaining any multi-step flow; api_docs still owns the exact schemas. Without a slug it lists the available slugs.",
    inputSchema: toStandardSchema<Static<typeof integrationGuideInput>>(integrationGuideInput),
    execute: async ({ slug }) => {
      if (slug === undefined) {
        const lines = (await readDocs()).map(
          (doc) => `- ${doc.slug}: ${doc.title}: ${doc.summary}`,
        );

        return lines.join("\n").slice(0, MAX_INDEX_CHARS);
      }

      const doc = await findDoc(slug);

      return doc === undefined
        ? `no integration guide is stored under ${slug}`
        : doc.markdown;
    },
  }),
});

export type GameBinding = {
  current: string | null;
  bind(gameId: string | null): Promise<void>;
};

export const createGameTools = (input: WriteContext & {
  games: AgentGamePort;
  binding: GameBinding;
  log: Logger;
}) => {
  const { games, scope, actor, agentRunId, audit, log, binding } = input;
  const ctx = { scope, actor, agentRunId, audit };

  return {
    list_games: createTool({
      id: "list_games",
      description:
        "The games of this organization with their hosting, status, and current version. Call it to resolve a game id before any game-scoped read or write; never guess one.",
      inputSchema: toStandardSchema<Static<typeof emptyInput>>(emptyInput),
      execute: async () => games.list(scope),
    }),
    deploy_game: createTool({
      id: "deploy_game",
      description:
        "Publish a complete self-contained HTML document as the current build of the game bound to this chat for one of its platforms and make it live. The bound game is implicit; pass the whole file, never a fragment. Pass the platformId when the game is on several platforms; when the developer names the platform, resolve its id with list_platforms first. With one assignment the platform is used directly. Requires the chat to be bound to a hosted game assigned to a platform.",
      inputSchema: toStandardSchema<Static<typeof deployGameInput>>(deployGameInput),
      requireApproval: true,
      execute: async ({ html, platformId }) => {
        const bound = binding.current;

        if (bound === null) {
          return "this chat is not bound to a game; bind one with bind_game or ask the user to pick one in the chat header";
        }

        if (html === "") {
          return "deploy_game needs the complete html of the game";
        }

        return writeTool(
          ctx,
          log,
          { tool: "deploy_game", action: "game.updated", resourceType: "game" },
          async () => {
            const deployed = await games.deploy(scope, actor.memberId, bound, html, platformId);

            return { id: bound, text: `deployed version ${deployed.version}; play it at ${deployed.url}` };
          },
        );
      },
    }),
    create_game: createTool({
      id: "create_game",
      description:
        "Create a game in this organization with a name, a slug, and hosting external for a game you serve yourself or hosted for one this platform serves. This binds the chat to the new game automatically, so deploy_game can publish its html next.",
      inputSchema: toStandardSchema<CreateGameBody>(CreateGameBody),
      requireApproval: true,
      execute: (body) =>
        writeTool(
          ctx,
          log,
          { tool: "create_game", action: "game.created", resourceType: "game" },
          async () => {
            const game = await games.create(scope, body);
            await binding.bind(game.id);

            return {
              id: game.id,
              text: `created game ${game.id} (${game.name}, ${game.hosting}, ${game.status}) and bound this chat to it`,
            };
          },
        ),
    }),
    bind_game: createTool({
      id: "bind_game",
      description:
        "Bind this chat to one of the organization's games so deploy_game publishes to it. Resolve the gameId with list_games first; never guess one. Replaces whatever the chat is bound to.",
      inputSchema: toStandardSchema<Static<typeof gameIdInput>>(gameIdInput),
      requireApproval: true,
      execute: ({ gameId }) =>
        guarded(log, "bind_game", async () => {
          const context = await games.context(scope, gameId);

          if (context === null) {
            return `no game with id ${gameId} in this organization; resolve one with list_games`;
          }

          await binding.bind(gameId);

          return `bound this chat to "${context.name}" (${context.slug}); deploy_game publishes to it`;
        }),
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
        "The platforms of this organization. Call it to resolve a platformId before any session, score, leaderboard, assignment, or tournament registration that names one; never guess one.",
      inputSchema: toStandardSchema<Static<typeof emptyInput>>(emptyInput),
      execute: async () => integrator.platforms.list(scope),
    }),
    read_match: createTool({
      id: "read_match",
      description:
        "One match with its participants: slots, scores, outcomes and participant ids. Call it to resolve the participant ids that complete_match needs.",
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
        "The best accepted score per player for one game, highest first. Resolve the gameId with list_games first; pass a platformId to narrow the board to one platform, otherwise it spans every platform of the organization.",
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
        "Standings of a tournament: the bracket round by round for a bracket tournament, the best score per player for a leaderboard one. Resolve the tournamentId with list_tournaments first.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      execute: async ({ tournamentId }) =>
        guarded(log, "read_tournament_standings", () =>
          integrator.standings.read(scope, tournamentId),
        ),
    }),
    create_tournament: createTool({
      id: "create_tournament",
      description:
        "Create a tournament in draft for a game of this organization, with format leaderboard or bracket and a slug unique in the organization. Resolve the gameId with list_games first. It stays in draft until open_tournament, so players cannot register yet.",
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
      description: "Open a draft tournament so players can register for it. Confirm it is still draft with read_tournament first.",
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
      description: "Register one player of a platform in a tournament that is open. Confirm the tournament is open with read_tournament and resolve the platformId with list_platforms first.",
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
        "Seed the bracket of an open bracket tournament from its registered players and start it. Needs at least two registered players; leaderboard tournaments never need this call.",
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
      description: "Cancel a tournament that has not completed. Confirm its status with read_tournament first; completed tournaments stay as they are.",
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
        "Create a match of exactly two players on one game. Resolve the gameId with list_games and the platformIds with list_platforms first. The answer lists both participant ids, which complete_match needs to name a winner.",
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
        "Close a match by naming its winner, either with a participant id from start_duel or read_match, or with the winner's platformId and externalUserId. Read the match first when the participant ids are unknown.",
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
            text: `match ${match.id} is ${match.status}, winner ${match.winnerParticipantId ?? "none: drawn"}`,
          };
        }),
    }),
    record_score: createTool({
      id: "record_score",
      description:
        "Record a score for a game session from the server side with x-api-key authority, skipping the per-session rate limit the client path enforces. The answer is the stored score with its status, flags and verification outcome, so report a flagged or refused score instead of treating it as stored.",
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
        "Create a platform in this organization with a name and a slug of 2-60 [a-z0-9-] characters. A platform is one place the organization's games are used; sessions and leaderboards name one of its ids, and a game takes sessions only on platforms it is assigned to.",
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
      description: "The tournaments of this organization, optionally filtered to one game. Call it to resolve a tournamentId before any tournament-scoped read or write; never guess one.",
      inputSchema: toStandardSchema<Static<typeof listTournamentsInput>>(listTournamentsInput),
      execute: async ({ gameId }) =>
        guarded(log, "list_tournaments", () =>
          integrator.tournaments.list(scope, gameId === undefined ? {} : { gameId }),
        ),
    }),
    read_tournament: createTool({
      id: "read_tournament",
      description:
        "One tournament with its game id, game name, format, status and timings. Call it to confirm the status a write needs: draft before open_tournament, open before register_player and seed_tournament, uncompleted before cancel_tournament.",
      inputSchema: toStandardSchema<Static<typeof tournamentIdInput>>(tournamentIdInput),
      execute: async ({ tournamentId }) =>
        guarded(log, "read_tournament", () =>
          integrator.tournaments.get(scope, tournamentId),
        ),
    }),
    create_assignment: createTool({
      id: "create_assignment",
      description:
        "Assign a game to one platform so it can take sessions there. Resolve the gameId with list_games and the platformId with list_platforms first; a session only opens on a game that is assigned to the named platform, active, and published.",
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
      description: "The platforms one game is assigned to. Call it to confirm the assignment a session needs before telling the developer the wiring is ready.",
      inputSchema: toStandardSchema<Static<typeof gameIdInput>>(gameIdInput),
      execute: async ({ gameId }) =>
        guarded(log, "list_assignments", () =>
          integrator.assignments.listByGame(scope, gameId),
        ),
    }),
    create_api_key: createTool({
      id: "create_api_key",
      description:
        "Issue an api key for this organization. Scope organization (sk_org_) is for management calls and never carries session or score permissions; scope platform (sk_plt_) with a platformId is for game servers, sessions, scores and MCP, and stays on that server, never in browser html. The key value is returned exactly once and is never stored, so hand it over verbatim and never ask for it again.",
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
  binding: GameBinding;
  log: Logger;
  audit: AuditService;
}) => ({
  ...createApiDocsTool(input),
  ...createGuideTool(),
  ...createGameTools(input),
  ...createIntegratorTools(input),
});
