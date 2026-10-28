import type { SessionEvent, SessionEventStore } from "./types.ts";

export function createMemorySessionEventStore(): SessionEventStore {
  const store = new Map<string, SessionEvent[]>();

  return {
    async append(sessionId, events) {
      store.set(sessionId, [...(store.get(sessionId) ?? []), ...events]);
    },

    async readAll(sessionId) {
      return store.get(sessionId) ?? [];
    },

    async delete(sessionId) {
      store.delete(sessionId);
    },

    async count(sessionId) {
      return store.get(sessionId)?.length ?? 0;
    },
  };
}
