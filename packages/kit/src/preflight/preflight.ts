import { execSync } from "node:child_process";
import type { Env } from "../config/types.ts";
import type { Logger } from "../logger/types.ts";
import { createRedis } from "../redis/redis.ts";

const REDIS_POLICY_TIMEOUT_MS = 2000;

function readFdLimit(): number | null {
  try {
    const parsed = Number(execSync("ulimit -n", { encoding: "utf8" }).trim());
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readRedisPolicy(url: string, logger: Logger): Promise<string | null> {
  const client = createRedis(url, { maxRetriesPerRequest: 1 });
  client.on("error", (error: Error) => {
    logger.debug("preflight redis probe failed", { err: error.message });
  });

  try {
    const reply = await Promise.race([
      client.config("GET", "maxmemory-policy"),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), REDIS_POLICY_TIMEOUT_MS)),
    ]);

    return Array.isArray(reply) && typeof reply[1] === "string" ? reply[1] : null;
  } catch {
    return null;
  } finally {
    client.disconnect();
  }
}

export async function preflight(env: Env, logger: Logger, fdLimit = readFdLimit()) {
  if (fdLimit !== null && fdLimit < env.FD_LIMIT_MINIMUM) {
    logger.error("preflight fd limit too low", {
      fdLimit,
      required: env.FD_LIMIT_MINIMUM,
      hint: "raise LimitNOFILE in the systemd unit, or pass --ulimit nofile to docker",
    });

    if (env.NODE_ENV === "production") {
      throw new Error(`the fd limit ${fdLimit} is below the required ${env.FD_LIMIT_MINIMUM}`);
    }
  }

  const redisPolicy = await readRedisPolicy(env.REDIS_URL, logger);

  if (redisPolicy !== null && redisPolicy !== "noeviction") {
    logger.error("preflight redis policy is wrong", {
      policy: redisPolicy,
      hint: "bullmq loses queued jobs when redis evicts keys, set maxmemory-policy noeviction",
    });

    if (env.NODE_ENV === "production") {
      throw new Error(`redis maxmemory-policy is ${redisPolicy}, it must be noeviction`);
    }
  }

  return { fdLimit, redisPolicy };
}
