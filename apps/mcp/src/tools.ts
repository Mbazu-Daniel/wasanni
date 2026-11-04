import { Value } from "@sinclair/typebox/value";
import { type Static, type TObject, Type } from "@sinclair/typebox";
import { apiDocsTool } from "./api-docs.ts";
import { callApi, type ApiRequest } from "./api.ts";
import type { McpConfig } from "./config.ts";

export type ToolResult = { ok: boolean; text: string };

export type Tool = {
  readonly name: string;
  readonly description: string;
  readonly schema: TObject;
  readonly readOnly: boolean;
  readonly run: (config: McpConfig, args: unknown) => Promise<ToolResult>;
};

const define = <S extends TObject>(input: {
  name: string;
  description: string;
  schema: S;
  readOnly?: boolean;
  request: (args: Static<S>) => ApiRequest;
}): Tool => ({
  name: input.name,
  description: input.description,
  schema: input.schema,
  readOnly: input.readOnly ?? false,
  run: async (config, args) =>
    callApi(config, input.request(Value.Decode(input.schema, args ?? {}))),
});

const key = (label: string) => Type.String({ minLength: 1, maxLength: 64, description: label });
const externalUserId = Type.String({
  minLength: 1,
  maxLength: 200,
  description: "the player's id in your own system",
});
const displayName = Type.Optional(Type.String({ maxLength: 200 }));
const gameId = key("game id");
const platformId = key("platform id — one of your organization's platforms");
const sessionId = key("session id");
const tournamentId = key("tournament id");
const matchId = key("match id");

const sessionPath = (value: string) => `/api/v1/sessions/${encodeURIComponent(value)}`;
const tournamentPath = (value: string) => `/api/v1/tournaments/${encodeURIComponent(value)}`;

export const tools: Tool[] = [
  apiDocsTool,
  define({
    name: "integration_guide",
    readOnly: true,
    description:
      "Wasanni's integration guides. No arguments lists the slugs; { slug } returns that guide as markdown. Read the quickstart before writing integration code.",
    schema: Type.Object({ slug: Type.Optional(Type.String({ minLength: 3, maxLength: 40 })) }),
    request: ({ slug }) =>
      slug === undefined
        ? { method: "GET", path: "/api/v1/docs" }
        : { method: "GET", path: `/api/v1/docs/${encodeURIComponent(slug)}` },
  }),
  define({
    name: "session_create",
    description:
      "Opens a game session for a player on one of the organization's platforms and returns the session, the sessionToken the game client posts scores with, and a realtimeUrl. Needs key permission session:create.",
    schema: Type.Object({
      platformId,
      gameId,
      externalUserId,
      externalName: displayName,
      mode: Type.Optional(Type.String({ maxLength: 80 })),
      configId: Type.Optional(key("game config id")),
      tournamentId: Type.Optional(tournamentId),
      matchId: Type.Optional(matchId),
    }),
    request: (args) => ({ method: "POST", path: "/api/v1/sessions", body: args }),
  }),
  define({
    name: "session_read",
    readOnly: true,
    description:
      "Reads one game session: status, ids, resolved config and timings. Needs key permission session:read.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }) => ({ method: "GET", path: sessionPath(value) }),
  }),
  define({
    name: "session_end",
    description:
      "Ends a game session, after which its scores are refused. An already-ended session comes back unchanged. Needs key permission session:update.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }) => ({
      method: "POST",
      path: `${sessionPath(value)}/end`,
      body: {},
    }),
  }),
  define({
    name: "session_events",
    readOnly: true,
    description:
      "The replay events recorded during a session as { source, events }. Needs key permission score:read.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }) => ({ method: "GET", path: `${sessionPath(value)}/events` }),
  }),
  define({
    name: "score_submit",
    description:
      "Submits a server-authoritative score for a session and returns the stored score row with its flags. A second score for the same session keeps the first number and merges the new flags. Needs key permission score:create.",
    schema: Type.Object({
      sessionId,
      score: Type.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
      endSession: Type.Optional(Type.Boolean()),
    }),
    request: ({ sessionId: value, ...body }) => ({
      method: "POST",
      path: `${sessionPath(value)}/score`,
      body,
    }),
  }),
  define({
    name: "score_hide",
    description:
      "Hides every score of one player across the organization, optionally limited to one game or platform, and returns { hidden }. Needs key permission score:hide.",
    schema: Type.Object({
      externalUserId,
      gameId: Type.Optional(gameId),
      platformId: Type.Optional(platformId),
    }),
    request: ({ externalUserId, gameId: game, platformId: platform }) => ({
      method: "POST",
      path: `/api/v1/players/${encodeURIComponent(externalUserId)}/scores/hide`,
      body: {
        ...(game === undefined ? {} : { gameId: game }),
        ...(platform === undefined ? {} : { platformId: platform }),
      },
    }),
  }),
  define({
    name: "leaderboard",
    readOnly: true,
    description:
      "The best accepted score per player for one game as { entries }, ranked. Without platformId the board spans every platform of the organization and each entry names its platformId. Needs key permission score:read.",
    schema: Type.Object({
      gameId,
      platformId: Type.Optional(platformId),
      mode: Type.Optional(Type.String({ maxLength: 80 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      offset: Type.Optional(Type.Integer({ minimum: 0 })),
      includeFlagged: Type.Optional(Type.Boolean()),
    }),
    request: ({ gameId: game, ...query }) => ({
      method: "GET",
      path: `/api/v1/games/${encodeURIComponent(game)}/leaderboards`,
      query,
    }),
  }),
  define({
    name: "tournament_list",
    readOnly: true,
    description:
      "The open tournaments of the key's organization, newest first, optionally filtered by gameId. Needs key permission tournament:read.",
    schema: Type.Object({ gameId: Type.Optional(gameId) }),
    request: ({ gameId: game }) => ({
      method: "GET",
      path: "/api/v1/tournaments",
      query: { gameId: game },
    }),
  }),
  define({
    name: "duel_enter",
    description:
      "Puts a player into matchmaking for a game and pairs them with another player waiting in a duel of the same game on the same platform. Returns { matchId, opponent, session, sessionToken, realtimeUrl }; a lone player comes back with opponent null and stays queued until someone else enters, and entering again re-reads their current pairing without creating a second queue entry. Scores go over the realtime socket with the sessionToken. Needs key permission session:create.",
    schema: Type.Object({
      platformId,
      gameId,
      externalUserId,
      externalName: displayName,
      configId: Type.Optional(key("game config id")),
    }),
    request: (args) => ({ method: "POST", path: "/api/v1/duels/enter", body: args }),
  }),
  define({
    name: "tournament_enter",
    description:
      "Registers a player in an open tournament and opens their play session in one call, returning { session, sessionToken, realtimeUrl }. Refused with 409 when the tournament is full or not open. Needs key permission tournament:register.",
    schema: Type.Object({ tournamentId, platformId, externalUserId, displayName }),
    request: ({ tournamentId: value, platformId: platform, externalUserId, displayName: name }) => ({
      method: "POST",
      path: `${tournamentPath(value)}/enter`,
      body: { platformId: platform, externalUserId, ...(name === undefined ? {} : { displayName: name }) },
    }),
  }),
  define({
    name: "tournament_leave",
    description:
      "Removes a player from a tournament. Refused once the tournament is completed. Needs key permission tournament:register.",
    schema: Type.Object({ tournamentId, platformId, externalUserId }),
    request: ({ tournamentId: value, platformId: platform, externalUserId }) => ({
      method: "DELETE",
      path: `${tournamentPath(value)}/players/${encodeURIComponent(externalUserId)}/leave`,
      body: { platformId: platform },
    }),
  }),
  define({
    name: "tournament_leaderboards",
    readOnly: true,
    description:
      "The ranked players of a tournament as { rows }, best accepted score per player. Needs key permission tournament:read.",
    schema: Type.Object({ tournamentId }),
    request: ({ tournamentId: value }) => ({
      method: "GET",
      path: `${tournamentPath(value)}/leaderboards`,
    }),
  }),
  define({
    name: "tournament_bracket",
    readOnly: true,
    description:
      "The seeded bracket of a bracket tournament: rounds, matches, seats and outcomes. Refused for a leaderboard tournament. Needs key permission tournament:read.",
    schema: Type.Object({ tournamentId }),
    request: ({ tournamentId: value }) => ({
      method: "GET",
      path: `${tournamentPath(value)}/bracket`,
    }),
  }),
  define({
    name: "match_win",
    description:
      "Completes a match by naming its winning player and advances a bracket automatically. An already-completed match comes back unchanged. Needs key permission match:complete.",
    schema: Type.Object({ matchId, platformId, externalUserId }),
    request: ({ matchId: value, platformId: platform, externalUserId }) => ({
      method: "POST",
      path: `/api/v1/matches/${encodeURIComponent(value)}/players/${encodeURIComponent(externalUserId)}/win`,
      body: { platformId: platform },
    }),
  }),
  define({
    name: "usage",
    readOnly: true,
    description:
      "The counters one of your platforms produced as { period, counters }. Accepts { platformId, period: 'YYYY-MM' } and defaults to the current month. The api refuses a platformId outside your organization. Needs key permission audit:read.",
    schema: Type.Object({
      platformId: key("platform id"),
      period: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}$" })),
    }),
    request: ({ platformId, period }) => ({
      method: "GET",
      path: `/api/v1/platforms/${encodeURIComponent(platformId)}/usage`,
      query: { period },
    }),
  }),
];
