export type SessionEvent = {
  seq: number;
  type: string;
  at: number;
  data: unknown;
};

export type SessionEventStore = {
  append(sessionId: string, events: SessionEvent[]): Promise<void>;
  readAll(sessionId: string): Promise<SessionEvent[]>;
  delete(sessionId: string): Promise<void>;
  count(sessionId: string): Promise<number>;
};
