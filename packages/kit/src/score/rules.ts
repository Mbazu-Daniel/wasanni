import type { ScoreFlag } from "@wasanni/contracts";

export const SCORE_RULE_FLAGS: readonly ScoreFlag[] = [
  "max_score_exceeded",
  "score_rate_exceeded",
];

type ScoreRules = {
  maxScore?: number;
  maxScorePerSecond?: number;
};

function readScoreRules(config: Record<string, unknown>): ScoreRules {
  const rules = config.rules;

  if (typeof rules !== "object" || rules === null) return {};

  const record = rules as Record<string, unknown>;

  return {
    maxScore: typeof record.maxScore === "number" ? record.maxScore : undefined,
    maxScorePerSecond:
      typeof record.maxScorePerSecond === "number" ? record.maxScorePerSecond : undefined,
  };
}

export function readRuleFlags(
  config: Record<string, unknown>,
  score: number,
  durationSeconds: number,
): ScoreFlag[] {
  const rules = readScoreRules(config);
  const flags: ScoreFlag[] = [];

  if (rules.maxScore !== undefined && score > rules.maxScore) {
    flags.push("max_score_exceeded");
  }

  if (
    rules.maxScorePerSecond !== undefined &&
    durationSeconds > 0 &&
    score / durationSeconds > rules.maxScorePerSecond
  ) {
    flags.push("score_rate_exceeded");
  }

  return flags;
}

export function isFlagged(flags: readonly ScoreFlag[]): boolean {
  return flags.some((flag) => SCORE_RULE_FLAGS.includes(flag));
}
