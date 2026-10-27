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
