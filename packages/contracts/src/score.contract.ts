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
  "verification_failed",
  "screenshot_missing",
  "callback_verified",
  "vision_verified",
  "vision_mismatch",
] as const;

export const SCORE_VERIFICATION_MODES = ["none", "callback", "vision"] as const;
export type ScoreVerificationMode = (typeof SCORE_VERIFICATION_MODES)[number];

export const SCREENSHOT_MAX_CHARS = 300_000;

export const SCREENSHOT_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export const SCORE_VERIFICATION_STATUSES = ["not_required", "passed", "failed", "unavailable"] as const;
export type ScoreVerificationStatus = (typeof SCORE_VERIFICATION_STATUSES)[number];

export const ScoreVerificationStatusModel = t.Union([
  t.Literal("not_required"),
  t.Literal("passed"),
  t.Literal("failed"),
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
  externalName: t.Union([t.String(), t.Null()]),
  mode: t.Union([t.String(), t.Null()]),
  score: t.Number(),
  status: ScoreStatus,
  flagged: t.Boolean(),
  flags: t.Array(t.String()),
  source: ScoreSource,
  verificationStatus: ScoreVerificationStatusModel,
  verificationReason: t.Union([t.String(), t.Null()]),
  submittedAt: t.String({ format: "date-time" }),
});
export type ScoreView = UnwrapSchema<typeof ScoreView>;

export const ScoreSingle = t.Object({ score: ScoreView });
export type ScoreSingle = UnwrapSchema<typeof ScoreSingle>;

export const SubmitScoreBody = t.Object({
  score: t.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  endSession: t.Optional(t.Boolean()),
  screenshot: t.Optional(
    t.String({
      maxLength: SCREENSHOT_MAX_CHARS,
      pattern: SCREENSHOT_PATTERN.source,
      contentEncoding: "base64",
      description:
        "A data-url png, jpeg or webp of the final frame. Required when the game's score verification mode is vision; the referee reads the on-screen score from it and compares it with the submitted score.",
    }),
  ),
});
export type SubmitScoreBody = UnwrapSchema<typeof SubmitScoreBody>;

export const LeaderboardEntry = t.Object({
  rank: t.Number({
    description:
      "1-based position in the whole board, ordered by score descending, then earliest submittedAt, then score row id. Rank continues across pages; it does not restart at 1.",
  }),
  sessionId: t.String(),
  platformId: t.String(),
  externalUserId: t.String(),
  externalName: t.Union([t.String(), t.Null()]),
  score: t.Number({
    description: "The player's best accepted score on this board: one entry per externalUserId.",
  }),
  flagged: t.Boolean({
    description: "True when score verification flagged the submission; flagged rows are omitted unless includeFlagged is true.",
  }),
  submittedAt: t.String({ format: "date-time" }),
});
export type LeaderboardEntry = UnwrapSchema<typeof LeaderboardEntry>;

export const LeaderboardList = t.Object({
  entries: t.Array(LeaderboardEntry),
  page: t.Object({
    limit: t.Number(),
    hasMore: t.Boolean(),
    cursor: t.Union([t.String(), t.Null()]),
  }),
});
export type LeaderboardList = UnwrapSchema<typeof LeaderboardList>;

export const GameLeaderboardQuery = t.Object({
  platformId: t.Optional(t.String()),
  mode: t.Optional(t.String({ maxLength: 80, description: "Restrict the board to one game mode." })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
  cursor: t.Optional(
    t.String({ description: "The page.cursor from the previous response; pages are cursor-based, so there is no offset." }),
  ),
  includeFlagged: t.Optional(
    t.Boolean({ description: "Include rows flagged by score verification. Defaults to false." }),
  ),
});
export type GameLeaderboardQuery = UnwrapSchema<typeof GameLeaderboardQuery>;

export const GameLeaderboardParams = t.Object({ gameId: t.String() });
export type GameLeaderboardParams = UnwrapSchema<typeof GameLeaderboardParams>;

export const HideScoresBody = t.Object({
  gameId: t.Optional(t.String()),
  platformId: t.Optional(t.String()),
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
