import { t, type UnwrapSchema } from "elysia";

export const GameSessionStatus = t.Union([
  t.Literal("active"),
  t.Literal("ended"),
  t.Literal("expired"),
]);
export type GameSessionStatus = UnwrapSchema<typeof GameSessionStatus>;

export const GameSessionView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  platformId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
  gameFileId: t.Union([t.String(), t.Null()]),
  gameConfigId: t.Union([t.String(), t.Null()]),
  tournamentId: t.Union([t.String(), t.Null()]),
  matchId: t.Union([t.String(), t.Null()]),
  externalUserId: t.String(),
  externalName: t.Union([t.String(), t.Null()]),
  mode: t.Union([t.String(), t.Null()]),
  status: GameSessionStatus,
  config: t.Record(t.String(), t.Unknown()),
  configSchemaVersion: t.Number(),
  startedAt: t.String({ format: "date-time" }),
  expiresAt: t.String({ format: "date-time" }),
  endedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});
export type GameSessionView = UnwrapSchema<typeof GameSessionView>;

export const GameSessionSingle = t.Object({ session: GameSessionView });
export type GameSessionSingle = UnwrapSchema<typeof GameSessionSingle>;

export const CreatedGameSession = t.Object({
  session: GameSessionView,
  sessionToken: t.String(),
  realtimeUrl: t.String(),
  joinCode: t.String(),
  playUrl: t.String(),
});
export type CreatedGameSession = UnwrapSchema<typeof CreatedGameSession>;

export const JoinCode = t.String({ minLength: 10, maxLength: 10, pattern: "^[A-Za-z0-9]{10}$" });
export type JoinCode = UnwrapSchema<typeof JoinCode>;

export const JoinCodeParams = t.Object({ code: JoinCode });
export type JoinCodeParams = UnwrapSchema<typeof JoinCodeParams>;

export const JoinResolveView = t.Object({
  playUrl: t.String(),
  realtimeUrl: t.String(),
  sessionId: t.String(),
  platformSlug: t.String(),
  gameSlug: t.String(),
  tournamentId: t.Union([t.String(), t.Null()]),
  matchId: t.Union([t.String(), t.Null()]),
  externalUserId: t.String(),
  externalName: t.Union([t.String(), t.Null()]),
  expiresAt: t.String({ format: "date-time" }),
});
export type JoinResolveView = UnwrapSchema<typeof JoinResolveView>;

export const JoinResolveSingle = t.Object({ join: JoinResolveView });
export type JoinResolveSingle = UnwrapSchema<typeof JoinResolveSingle>;

export const CreateGameSessionBody = t.Object({
  gameId: t.String(),
  platformId: t.String(),
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
  externalName: t.Optional(t.String({ maxLength: 200 })),
  mode: t.Optional(t.String({ maxLength: 80 })),
  configId: t.Optional(t.String()),
  tournamentId: t.Optional(t.String()),
  matchId: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});
export type CreateGameSessionBody = UnwrapSchema<typeof CreateGameSessionBody>;

export const GameSessionIdParams = t.Object({ sessionId: t.String() });
export type GameSessionIdParams = UnwrapSchema<typeof GameSessionIdParams>;
