import { sql } from "drizzle-orm";

export const DAILY_SOURCES = {
  sessions_created: {
    table: "game_session",
    column: "started_at",
    gameColumn: "game_id",
    platformFilter: (platformId: string) =>
      sql`platform_id = ${platformId}`,
  },
  scores_submitted: {
    table: "game_session_score",
    column: "submitted_at",
    gameColumn: "game_id",
    platformFilter: (platformId: string) =>
      sql`platform_id = ${platformId}`,
  },
  matches_created: {
    table: "match",
    column: "created_at",
    gameColumn: "game_id",
    platformFilter: (platformId: string) => sql`exists (
      select 1 from match_participant mp
      where mp.match_id = match.id
        and mp.platform_id = ${platformId}
    )`,
  },
  tournaments_created: {
    table: "tournament",
    column: "created_at",
    gameColumn: "game_id",
    platformFilter: (platformId: string) => sql`exists (
      select 1 from game_platform_assignment ga
      where ga.id = tournament.assignment_id
        and ga.platform_id = ${platformId}
    )`,
  },
} as const;
