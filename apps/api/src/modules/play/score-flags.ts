import type { ScoreFlag, ScoreSource } from "@wasanni/contracts";
import { readRuleFlags } from "@wasanni/kit";
import type { GameSessionRow } from "./types.ts";

export const readScoreFlags = (
  session: GameSessionRow,
  score: number,
  source: ScoreSource,
  submittedAt: Date,
  resubmitted: boolean,
): ScoreFlag[] => {
  const flags: ScoreFlag[] = [];

  if (source === "client") flags.push("client_source");
  if (submittedAt.getTime() > session.expiresAt.getTime()) flags.push("late");
  if (resubmitted) flags.push("resubmitted");

  const durationSeconds = Math.max(
    0,
    (submittedAt.getTime() - session.startedAt.getTime()) / 1000,
  );

  flags.push(...readRuleFlags(session.configSnapshot, score, durationSeconds));

  return flags;
};
