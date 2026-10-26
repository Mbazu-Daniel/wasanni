import IORedis from "ioredis";
import type { Redis } from "./types.ts";

export function createRedis(
  url: string,
  opts?: { maxRetriesPerRequest?: number | null; keyPrefix?: string },
): Redis {
  return new IORedis(url, {
    maxRetriesPerRequest: opts?.maxRetriesPerRequest ?? null,
    ...(opts?.keyPrefix ? { keyPrefix: opts.keyPrefix } : {}),
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

export async function pingRedis(client: Redis): Promise<boolean> {
  return (await client.ping()) === "PONG";
}
