export const DAILY_SOURCES = {
  sessions_created: { table: "game_session", column: "started_at" },
  scores_submitted: { table: "game_session_score", column: "submitted_at" },
  matches_created: { table: "match", column: "created_at" },
  tournaments_created: { table: "tournament", column: "created_at" },
} as const;
