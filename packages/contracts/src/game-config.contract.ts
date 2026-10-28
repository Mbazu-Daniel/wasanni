import { t, type UnwrapSchema } from "elysia";

export const ScoreVerificationCallback = t.Object({
  url: t.String({ format: "uri", maxLength: 2000 }),
  secret: t.Optional(t.String({ minLength: 16, maxLength: 200 })),
  timeoutMs: t.Optional(t.Number({ minimum: 100, maximum: 10_000 })),
});
export type ScoreVerificationCallback = UnwrapSchema<typeof ScoreVerificationCallback>;

export const ScoreVerificationConfig = t.Union([
  t.Object({ mode: t.Literal("none") }),
  t.Object({ mode: t.Literal("callback"), callback: ScoreVerificationCallback }),
]);
export type ScoreVerificationConfig = UnwrapSchema<typeof ScoreVerificationConfig>;

export const SCORE_GAME_TYPES = [
  "generic",
  "match3",
  "endless_runner",
  "block_puzzle",
  "pool",
  "racing",
  "shooter",
  "board",
  "arcade",
] as const;
export type ScoreGameType = (typeof SCORE_GAME_TYPES)[number];

export const SCORE_FLAG_RULES = ["max_score", "score_rate"] as const;
export type ScoreFlagRule = (typeof SCORE_FLAG_RULES)[number];

export const GameConfigView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  assignmentId: t.String(),
  name: t.String(),
  config: t.Record(t.String(), t.Unknown()),
  schemaVersion: t.Number(),
  revision: t.Number(),
  isDefault: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type GameConfigView = UnwrapSchema<typeof GameConfigView>;

export const GameConfigSingle = t.Object({ config: GameConfigView });
export type GameConfigSingle = UnwrapSchema<typeof GameConfigSingle>;

export const GameConfigList = t.Object({ configs: t.Array(GameConfigView) });
export type GameConfigList = UnwrapSchema<typeof GameConfigList>;

export const GameConfigContent = t.Intersect([
  t.Record(t.String(), t.Unknown()),
  t.Object({ scoreVerification: t.Optional(ScoreVerificationConfig) }),
]);
export type GameConfigContent = UnwrapSchema<typeof GameConfigContent>;

export const CreateGameConfigBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  config: t.Optional(GameConfigContent),
  schemaVersion: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  isDefault: t.Optional(t.Boolean()),
});
export type CreateGameConfigBody = UnwrapSchema<typeof CreateGameConfigBody>;

export const UpdateGameConfigBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    config: t.Optional(GameConfigContent),
    schemaVersion: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
    isDefault: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateGameConfigBody = UnwrapSchema<typeof UpdateGameConfigBody>;

export const AssignmentParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
});
export type AssignmentParams = UnwrapSchema<typeof AssignmentParams>;

export const GameConfigIdParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
  configId: t.String(),
});
export type GameConfigIdParams = UnwrapSchema<typeof GameConfigIdParams>;
