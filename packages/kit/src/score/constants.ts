import type { ScoreFlag } from "@wasanni/contracts";

export const DEFAULT_SESSION_DURATION_SECONDS = 3600;

export const MAX_SESSION_DURATION_SECONDS = 86_400;

export const MIN_SESSION_DURATION_SECONDS = 60;

export const SCORE_RULE_FLAGS: readonly ScoreFlag[] = [
  "max_score_exceeded",
  "score_rate_exceeded",
];
