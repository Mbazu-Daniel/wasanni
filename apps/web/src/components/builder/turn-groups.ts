import type { AgentTurnView } from "@/lib/agent-types";
import type { TurnGroup } from "./types.ts";

export const groupTurns = (turns: AgentTurnView[]): TurnGroup[] => {
  const groups: TurnGroup[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      groups.push({ prompt: turn, answers: [] });
      continue;
    }
    const current = groups[groups.length - 1];
    if (current === undefined) groups.push({ prompt: null, answers: [turn] });
    else current.answers.push(turn);
  }
  return groups;
};
