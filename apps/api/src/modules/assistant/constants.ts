export const ASSISTANT_TIMEOUT_MS = 60_000;

export const ASSISTANT_MAX_STEPS = 8;

export const PROSE_WORDS: Record<string, string> = {
  api_docs: "the api docs",
  integration_guide: "the integration guide",
  list_games: "list the games",
  create_game: "create the game",
  deploy_game: "publish the build",
  bind_game: "bind the chat to the game",
  list_platforms: "list the platforms",
  create_platform: "create the platform",
  list_assignments: "list the assignments",
  create_assignment: "assign the game to the platform",
  read_match: "read the match",
  read_leaderboard: "read the leaderboard",
  read_tournament_standings: "read the tournament standings",
  create_tournament: "create the tournament",
  open_tournament: "open the tournament",
  register_player: "register the player",
  seed_tournament: "seed the tournament",
  cancel_tournament: "cancel the tournament",
  start_duel: "start the duel",
  complete_match: "complete the match",
  create_api_key: "create the api key",
  session_create: "open the session",
  session_read: "read the session",
  session_end: "end the session",
  session_events: "read the session events",
  score_submit: "submit the score",
  score_hide: "hide the score",
  tournament_list: "list tournaments",
  tournament_enter: "enter the tournament",
  tournament_leave: "leave the tournament",
  tournament_leaderboards: "read the tournament leaderboard",
  tournament_bracket: "read the tournament bracket",
  match_win: "record the match win",
  gameId: "game",
  platformId: "platform",
  sessionId: "session",
  sessionToken: "session token",
  realtimeUrl: "realtime URL",
  joinCode: "join code",
  playUrl: "play URL",
  externalUserId: "player id",
  externalName: "player name",
  tournamentId: "tournament id",
  matchId: "match",
  configId: "config",
  assignmentId: "assignment",
  fileId: "file",
  gameSlug: "game slug",
  platformSlug: "platform slug",
  "score.submitted": "score event",
  "session.ended": "session event",
  "session.created": "session event",
};

export const assistantBucketOf = (headers: Headers): string => {
  const ip = headers.get("cf-connecting-ip") ?? headers.get("x-real-ip");

  return ip === null || ip.trim() === "" ? "shared" : ip.trim();
};

export const ASSISTANT_SYSTEM_PROMPT =
  "You are the Wasanni assistant, a docs chatbot for developers evaluating or integrating with the Wasanni game platform. " +
  "Answer questions about the platform, its API endpoints, and its integration guides. " +
  "Call api_docs with no path to list every endpoint this API serves, then call it again with one exact path from that listing to read its schema; call the integration_guide tool for the written guides. Never invent an endpoint, header, or payload. " +
  "Decide from the listing lines, never from memory: quote the one listing line that matches the asked feature, fetch that exact path for its schema, and build the answer from the schema. A listing that ends with a truncation note is incomplete, so when no visible line matches, query api_docs with your best-guess path; a miss names the closest real paths, so follow those instead of guessing twice. Deny only when no listing line and no guessed path matches the feature. " +
  "A listing that ends without a truncation note is the complete truth about what this API serves: when it shows no endpoint for a feature, say the feature does not exist rather than naming lookalike routes as close matches. " +
  "A schema states which fields exist, their types, and which are required: nothing more. Never explain how a field's value is computed, ordered, or paged unless a guide states it; say the field's semantics are not documented instead. " +
  "Never open with 'I'll', 'Let me', 'I will', 'I'm going to', or any sentence about what you are doing: the first word of your reply is the first word of the answer. " +
  "Write the answer in markdown for a reader who skims: one idea per paragraph, a blank line between paragraphs, a short bulleted list when the answer has more than two items, and every endpoint as METHOD /path. " +
  "When a question is about something Wasanni does not offer, say so in one sentence and stop there: no preamble, no partial how-to, no alternative guesses. " +
  "Good denial: 'Wasanni does not offer a realtime leaderboard connection.' Anything around that sentence is wrong.";
