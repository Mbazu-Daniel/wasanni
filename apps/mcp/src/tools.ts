import { Value } from "@sinclair/typebox/value";
import { type Static, type TObject, Type } from "@sinclair/typebox";
import { PLATFORM_OPERATIONS, type PlatformToolOperation } from "@wasanni/contracts";
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

const operationOf = (tool: string): PlatformToolOperation => {
  const found = PLATFORM_OPERATIONS.find((candidate) => candidate.tool === tool);
  if (found === undefined) throw new Error(`no platform operation is named ${tool}`);
  return found;
};

const fillPath = (template: string, params: Record<string, string>): string =>
  Object.entries(params).reduce(
    (path, [name, value]) => path.split(`{${name}}`).join(encodeURIComponent(value)),
    template,
  );

const define = <S extends TObject>(input: {
  name: string;
  blurb: string;
  schema: S;
  readOnly?: boolean;
  request: (args: Static<S>, path: string) => Omit<ApiRequest, "method">;
}): Tool => {
  const operation = operationOf(input.name);

  return {
    name: input.name,
    description: `${input.blurb} Needs key permission ${operation.permission}.`,
    schema: input.schema,
    readOnly: input.readOnly ?? false,
    run: async (config, args) =>
      callApi(config, {
        method: operation.method,
        ...input.request(Value.Decode(input.schema, args ?? {}), operation.path),
      }),
  };
};

const defineGuide = <S extends TObject>(input: {
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
const platformId = key("platform id: one of your organization's platforms");
const sessionId = key("session id");
const tournamentId = key("tournament id");
const matchId = key("match id");

export const tools: Tool[] = [
  apiDocsTool,
  defineGuide({
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
    blurb:
      "Opens a game session for a player on one of the organization's platforms and returns the session, the sessionToken the game client posts scores with, and a realtimeUrl.",
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
    request: (args, path) => ({ path, body: args }),
  }),
  define({
    name: "session_read",
    readOnly: true,
    blurb:
      "Reads one game session: status, ids, resolved config and timings.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }, path) => ({ path: fillPath(path, { sessionId: value }) }),
  }),
  define({
    name: "session_end",
    blurb:
      "Ends a game session, after which its scores are refused. An already-ended session comes back unchanged.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }, path) => ({
      path: fillPath(path, { sessionId: value }),
      body: {},
    }),
  }),
  define({
    name: "session_events",
    readOnly: true,
    blurb:
      "The replay events recorded during a session as { source, events }.",
    schema: Type.Object({ sessionId }),
    request: ({ sessionId: value }, path) => ({ path: fillPath(path, { sessionId: value }) }),
  }),
  define({
    name: "score_submit",
    blurb:
      "Submits a server-authoritative score for a session and returns the stored score row with its flags. A second score for the same session keeps the first number and merges the new flags.",
    schema: Type.Object({
      sessionId,
      score: Type.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
      endSession: Type.Optional(Type.Boolean()),
    }),
    request: ({ sessionId: value, ...body }, path) => ({
      path: fillPath(path, { sessionId: value }),
      body,
    }),
  }),
  define({
    name: "score_hide",
    blurb:
      "Hides every score of one player across the organization, optionally limited to one game or platform, and returns { hidden }.",
    schema: Type.Object({
      externalUserId,
      gameId: Type.Optional(gameId),
      platformId: Type.Optional(platformId),
    }),
    request: ({ externalUserId, gameId: game, platformId: platform }, path) => ({
      path: fillPath(path, { externalUserId }),
      body: {
        ...(game === undefined ? {} : { gameId: game }),
        ...(platform === undefined ? {} : { platformId: platform }),
      },
    }),
  }),
  define({
    name: "leaderboard",
    readOnly: true,
    blurb:
      "The best accepted score per player for one game as { entries }, ranked. Without platformId the board spans every platform of the organization and each entry names its platformId.",
    schema: Type.Object({
      gameId,
      platformId: Type.Optional(platformId),
      mode: Type.Optional(Type.String({ maxLength: 80 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      offset: Type.Optional(Type.Integer({ minimum: 0 })),
      includeFlagged: Type.Optional(Type.Boolean()),
    }),
    request: ({ gameId: game, ...query }, path) => ({
      path: fillPath(path, { gameId: game }),
      query,
    }),
  }),
  define({
    name: "tournament_list",
    readOnly: true,
    blurb:
      "The open tournaments of the key's organization, newest first, optionally filtered by gameId.",
    schema: Type.Object({ gameId: Type.Optional(gameId) }),
    request: ({ gameId: game }) => ({
      path: "/api/v1/tournaments",
      query: { gameId: game },
    }),
  }),
  define({
    name: "duel_enter",
    blurb:
      "Puts a player into matchmaking for a game and pairs them with another player waiting in a duel of the same game on the same platform. Returns { matchId, opponent, session, sessionToken, realtimeUrl }; a lone player comes back with opponent null and stays queued until someone else enters, and entering again re-reads their current pairing without creating a second queue entry. Scores go over the realtime socket with the sessionToken.",
    schema: Type.Object({
      platformId,
      gameId,
      externalUserId,
      externalName: displayName,
      configId: Type.Optional(key("game config id")),
    }),
    request: (args) => ({ path: "/api/v1/duels/enter", body: args }),
  }),
  define({
    name: "tournament_enter",
    blurb:
      "Registers a player in an open tournament and opens their play session in one call, returning { session, sessionToken, realtimeUrl }. Refused with 409 when the tournament is full or not open.",
    schema: Type.Object({ tournamentId, platformId, externalUserId, displayName }),
    request: ({ tournamentId: value, platformId: platform, externalUserId, displayName: name }, path) => ({
      path: fillPath(path, { tournamentId: value }),
      body: { platformId: platform, externalUserId, ...(name === undefined ? {} : { displayName: name }) },
    }),
  }),
  define({
    name: "tournament_leave",
    blurb:
      "Removes a player from a tournament. Refused once the tournament is completed.",
    schema: Type.Object({ tournamentId, platformId, externalUserId }),
    request: ({ tournamentId: value, platformId: platform, externalUserId }, path) => ({
      path: fillPath(path, {
        tournamentId: value,
        externalUserId,
      }),
      body: { platformId: platform },
    }),
  }),
  define({
    name: "tournament_leaderboards",
    readOnly: true,
    blurb:
      "The ranked players of a tournament as { rows }, best accepted score per player.",
    schema: Type.Object({ tournamentId }),
    request: ({ tournamentId: value }, path) => ({
      path: fillPath(path, { tournamentId: value }),
    }),
  }),
  define({
    name: "tournament_bracket",
    readOnly: true,
    blurb:
      "The seeded bracket of a bracket tournament: rounds, matches, seats and outcomes. Refused for a leaderboard tournament.",
    schema: Type.Object({ tournamentId }),
    request: ({ tournamentId: value }, path) => ({
      path: fillPath(path, { tournamentId: value }),
    }),
  }),
  define({
    name: "match_win",
    blurb:
      "Completes a match by naming its winning player and advances a bracket automatically. An already-completed match comes back unchanged.",
    schema: Type.Object({ matchId, platformId, externalUserId }),
    request: ({ matchId: value, platformId: platform, externalUserId }, path) => ({
      path: fillPath(path, {
        matchId: value,
        externalUserId,
      }),
      body: { platformId: platform },
    }),
  }),
  define({
    name: "usage",
    readOnly: true,
    blurb:
      "The counters one of your platforms produced as { period, counters }. Accepts { platformId, period: 'YYYY-MM' } and defaults to the current month. The api refuses a platformId outside your organization.",
    schema: Type.Object({
      platformId: key("platform id"),
      period: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}$" })),
    }),
    request: ({ platformId, period }, path) => ({
      path: fillPath(path, { platformId }),
      query: { period },
    }),
  }),
];
