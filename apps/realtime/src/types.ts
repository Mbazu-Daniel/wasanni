import type { RealtimeServerMessage, ScoreView } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
import type { Logger, Redis } from "@wasanni/kit";
import type { createRealtimeApp } from "./app.ts";

export type RealtimeSocket = {
  readonly id: string;
  send(payload: string): unknown;
  close(code?: number, reason?: string): unknown;
};

export type RealtimeSession = {
  sessionId: string;
  token: string;
  organizationId: string;
  platformId: string;
  gameId: string;
  externalUserId: string;
};

export type RoomRegistry = {
  join(room: string, socket: RealtimeSocket): number;
  leave(room: string, socket: RealtimeSocket): number;
  broadcast(room: string, message: RealtimeServerMessage, exceptId?: string): void;
  closeRoom(room: string, message: RealtimeServerMessage, code: number, reason: string): void;
  closeAll(code: number, reason: string): void;
};

export type SessionEndedMessage = Extract<RealtimeServerMessage, { type: "session.ended" }>;

export type RoomBridge = {
  publish(room: string, message: RealtimeServerMessage, exceptId?: string): void;
  endSession(room: string, message: SessionEndedMessage): void;
  start(): Promise<void>;
  stop(): Promise<void>;
};

export type ScoreForwardInput = {
  sessionId: string;
  token: string;
  score: number;
  endSession: boolean;
  signature?: string;
};

export type ScoreForwardResult =
  | { ok: true; score: ScoreView }
  | { ok: false; rejected: boolean; message: string };

export type ScoreForwarder = {
  forward(input: ScoreForwardInput): Promise<ScoreForwardResult>;
};

export type GatewayDeps = {
  rooms: RoomRegistry;
  bridge: RoomBridge;
  forwardScore: ScoreForwarder;
  logger: Logger;
};

export type Gateway = {
  connect(socket: RealtimeSocket, session: RealtimeSession): void;
  message(socket: RealtimeSocket, raw: unknown, session: RealtimeSession): Promise<void>;
  close(socket: RealtimeSocket, session: RealtimeSession): void;
};

export type RealtimeDeps = GatewayDeps & {
  db: Db;
  version: string;
  startedAt: number;
  idleTimeoutSeconds: number;
  maxMessageBytes: number;
  ready: () => Promise<{ database: boolean; redis: boolean }>;
};

export type ScoreForwarderDeps = {
  apiUrl: string;
  logger: Logger;
  fetch?: typeof fetch;
};

export type BridgeDeps = {
  redis: Redis;
  rooms: RoomRegistry;
  logger: Logger;
  instanceId?: string;
};

export type Envelope = {
  origin: string;
  room: string;
  message: RealtimeServerMessage;
};

export type RealtimeContext = { realtimeSession?: RealtimeSession };

export type RealtimeApp = ReturnType<typeof createRealtimeApp>;
