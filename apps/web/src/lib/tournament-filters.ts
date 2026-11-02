import type { TournamentStatus } from "@wasanni/contracts";

export const TOURNAMENT_STATUS_FILTERS = [
  "all",
  "draft",
  "scheduled",
  "open",
  "running",
  "completed",
] as const satisfies readonly ("all" | TournamentStatus)[];

export type TournamentStatusFilter = (typeof TOURNAMENT_STATUS_FILTERS)[number];
