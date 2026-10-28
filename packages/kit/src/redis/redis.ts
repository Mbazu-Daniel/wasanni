import IORedis from "ioredis";
import type { Redis } from "./types.ts";

const REDIS_CONNECT_TIMEOUT_MS = 5000;

export function createRedis(
  url: string,
  opts?: { maxRetriesPerRequest?: number | null; keyPrefix?: string },
): Redis {
  return new IORedis(url, {
    maxRetriesPerRequest: opts?.maxRetriesPerRequest ?? null,
    ...(opts?.keyPrefix ? { keyPrefix: opts.keyPrefix } : {}),
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
  });
}

export function isRedisReady(client: Redis): boolean {
  return client.status === "ready";
}
