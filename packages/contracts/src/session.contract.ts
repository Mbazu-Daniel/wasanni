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
  externalUserName: t.Union([t.String(), t.Null()]),
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
});
export type CreatedGameSession = UnwrapSchema<typeof CreatedGameSession>;

export const CreateGameSessionBody = t.Object({
  gameId: t.String(),
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
  externalUserName: t.Optional(t.String({ maxLength: 200 })),
  mode: t.Optional(t.String({ maxLength: 80 })),
  configId: t.Optional(t.String()),
  tournamentId: t.Optional(t.String()),
  matchId: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});
export type CreateGameSessionBody = UnwrapSchema<typeof CreateGameSessionBody>;

export const GameSessionIdParams = t.Object({ sessionId: t.String() });
export type GameSessionIdParams = UnwrapSchema<typeof GameSessionIdParams>;
