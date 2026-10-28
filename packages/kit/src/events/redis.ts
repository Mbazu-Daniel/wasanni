import type IORedis from "ioredis";
import type { SessionEvent, SessionEventStore } from "./types.ts";

const KEY_PREFIX = "sess:evt:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export function createRedisSessionEventStore(
  redis: IORedis,
  options?: { ttlSeconds?: number },
): SessionEventStore {
  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const key = (sessionId: string) => `${KEY_PREFIX}${sessionId}`;

  return {
    async append(sessionId, events) {
      if (events.length === 0) return;

      const pipeline = redis.pipeline();
      const sessionKey = key(sessionId);

      for (const event of events) {
        pipeline.rpush(sessionKey, JSON.stringify(event));
      }

      pipeline.expire(sessionKey, ttl);
      await pipeline.exec();
    },

    async readAll(sessionId) {
      const raw = await redis.lrange(key(sessionId), 0, -1);
      return raw.map((line) => JSON.parse(line) as SessionEvent);
    },

    async delete(sessionId) {
      await redis.del(key(sessionId));
    },

    async count(sessionId) {
      return redis.llen(key(sessionId));
    },
  };
}
