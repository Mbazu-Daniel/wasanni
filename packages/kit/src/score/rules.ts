import type { ScoreFlag } from "@wasanni/contracts";
import { SCORE_RULE_FLAGS } from "./constants.ts";
import { readGameConfig } from "./config.ts";

export function readRuleFlags(
  config: Record<string, unknown>,
  score: number,
  durationSeconds: number,
): ScoreFlag[] {
  const { rules } = readGameConfig(config);
  const flags: ScoreFlag[] = [];

  const checks = rules.checks ?? ["max_score", "score_rate"];

  if (checks.includes("max_score") && rules.maxScore !== undefined && score > rules.maxScore) {
    flags.push("max_score_exceeded");
  }

  if (
    checks.includes("score_rate") &&
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
