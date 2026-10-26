import { env, createLogger, createRedis } from "@wasanni/kit";
import { createDb } from "@wasanni/db";

const cfg = env();

const logger = createLogger({
  level: cfg.LOG_LEVEL,
  pretty: cfg.NODE_ENV !== "production",
  bindings: { service: "worker" },
});

const { sql } = createDb(cfg.DATABASE_URL, { max: 5 });
const redis = createRedis(cfg.REDIS_URL);

logger.info("worker started");

const keepAlive = setInterval(() => {}, 1 << 30);

async function shutdown(signal: string): Promise<void> {
  logger.info("shutting down", { signal });
  clearInterval(keepAlive);
  await sql.end({ timeout: 5 });
  redis.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
