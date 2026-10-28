import type { ScoreFlagRule, ScoreGameType } from "@wasanni/contracts";

export type ScoreRules = {
  gameType?: ScoreGameType;
  checks?: ScoreFlagRule[];
  maxScore?: number;
  maxScorePerSecond?: number;
};
