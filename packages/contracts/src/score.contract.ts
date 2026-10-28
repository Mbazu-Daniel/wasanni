import { t, type UnwrapSchema } from "elysia";

export const ScoreStatus = t.Union([t.Literal("accepted"), t.Literal("hidden")]);
export type ScoreStatus = UnwrapSchema<typeof ScoreStatus>;

export const ScoreSource = t.Union([t.Literal("server"), t.Literal("client")]);
export type ScoreSource = UnwrapSchema<typeof ScoreSource>;

export const SCORE_FLAGS = [
  "client_source",
  "late",
  "resubmitted",
  "max_score_exceeded",
  "score_rate_exceeded",
  "verification_unavailable",
  "hmac_verified",
  "callback_verified",
] as const;

export const SCORE_VERIFICATION_MODES = ["none", "hmac", "callback", "both"] as const;
export type ScoreVerificationMode = (typeof SCORE_VERIFICATION_MODES)[number];

export const SCORE_VERIFICATION_STATUSES = ["not_required", "passed", "unavailable"] as const;
export type ScoreVerificationStatus = (typeof SCORE_VERIFICATION_STATUSES)[number];

export const ScoreVerificationModeModel = t.Union([
  t.Literal("none"),
  t.Literal("hmac"),
  t.Literal("callback"),
  t.Literal("both"),
]);

export const ScoreVerificationStatusModel = t.Union([
  t.Literal("not_required"),
  t.Literal("passed"),
  t.Literal("unavailable"),
]);

export type ScoreFlag = (typeof SCORE_FLAGS)[number];

export const ScoreView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  sessionId: t.String(),
  platformId: t.String(),
  gameId: t.String(),
  externalUserId: t.String(),
  mode: t.Union([t.String(), t.Null()]),
  score: t.Number(),
  status: ScoreStatus,
  flagged: t.Boolean(),
  flags: t.Array(t.String()),
  source: ScoreSource,
  verificationStatus: ScoreVerificationStatusModel,
  submittedAt: t.String({ format: "date-time" }),
});
export type ScoreView = UnwrapSchema<typeof ScoreView>;

export const ScoreSingle = t.Object({ score: ScoreView });
export type ScoreSingle = UnwrapSchema<typeof ScoreSingle>;

export const SubmitScoreBody = t.Object({
  score: t.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  signature: t.Optional(t.String({ maxLength: 512 })),
  endSession: t.Optional(t.Boolean()),
});
export type SubmitScoreBody = UnwrapSchema<typeof SubmitScoreBody>;

export const LeaderboardEntry = t.Object({
  rank: t.Number(),
  sessionId: t.String(),
  externalUserId: t.String(),
  score: t.Number(),
  flagged: t.Boolean(),
  submittedAt: t.String({ format: "date-time" }),
});
export type LeaderboardEntry = UnwrapSchema<typeof LeaderboardEntry>;

export const LeaderboardList = t.Object({ entries: t.Array(LeaderboardEntry) });
export type LeaderboardList = UnwrapSchema<typeof LeaderboardList>;

export const LeaderboardQuery = t.Object({
  gameId: t.String(),
  mode: t.Optional(t.String({ maxLength: 80 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
  offset: t.Optional(t.Number({ minimum: 0 })),
  includeFlagged: t.Optional(t.Boolean()),
});
export type LeaderboardQuery = UnwrapSchema<typeof LeaderboardQuery>;

export const HideScoresBody = t.Object({
  gameId: t.Optional(t.String()),
});
export type HideScoresBody = UnwrapSchema<typeof HideScoresBody>;

export const HideScoresResult = t.Object({ hidden: t.Number() });
export type HideScoresResult = UnwrapSchema<typeof HideScoresResult>;

export const SessionEventModel = t.Object({
  seq: t.Number(),
  type: t.String(),
  at: t.Number(),
  data: t.Unknown(),
});
export type SessionEventModel = UnwrapSchema<typeof SessionEventModel>;

export const ReplayView = t.Object({
  source: t.Union([t.Literal("redis"), t.Literal("r2")]),
  events: t.Array(SessionEventModel),
});
export type ReplayView = UnwrapSchema<typeof ReplayView>;

export const PlayerScoresParams = t.Object({
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
});
export type PlayerScoresParams = UnwrapSchema<typeof PlayerScoresParams>;
