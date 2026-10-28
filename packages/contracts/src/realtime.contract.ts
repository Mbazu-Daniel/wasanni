import type { ScoreView } from "./score.contract.ts";

export const REALTIME_PATH = "/rt";

export const REALTIME_CLOSE = {
  shutdown: 1001,
  sessionEnded: 4000,
} as const;

export const REALTIME_ERROR_CODES = [
  "bad_message",
  "score_failed",
] as const;

export type RealtimeErrorCode = (typeof REALTIME_ERROR_CODES)[number];

export type RealtimeClientMessage =
  | { type: "ping" }
  | { type: "score"; score: number; endSession?: boolean }
  | { type: "event"; data: unknown };

export type RealtimeServerMessage =
  | { type: "ready"; sessionId: string; roomSize: number; at: number }
  | { type: "pong"; at: number }
  | { type: "score.recorded"; score: ScoreView; at: number }
  | { type: "peer.event"; sessionId: string; data: unknown; at: number }
  | { type: "session.ended"; at: number }
  | { type: "error"; code: RealtimeErrorCode; message: string; at: number };
