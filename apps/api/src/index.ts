import { env, createLogger, createRedis, pingRedis } from "@wasanni/kit";
import { createDb, pingDatabase } from "@wasanni/db";
import { createApp } from "./app.ts";
import { DOCS_PATH } from "./constants.ts";
import { AUTH_REFERENCE_PATH } from "./modules/auth/constants.ts";
import type { AppDeps } from "./types.ts";
import pkg from "../package.json" with { type: "json" };

const cfg = env();

const logger = createLogger({
  level: cfg.LOG_LEVEL,
  pretty: cfg.NODE_ENV !== "production",
  bindings: { service: "api" },
});

const { db, sql } = createDb(cfg.DATABASE_URL, { max: 20 });
const redis = createRedis(cfg.REDIS_URL);

const deps: AppDeps = {
  logger,
  version: pkg.version,
  startedAt: Date.now(),
  corsOrigins: [cfg.PUBLIC_WEB_ORIGIN],
  db,
  env: cfg,
  ready: async () => {
    const [database, redisOk] = await Promise.all([
      pingDatabase(sql).catch(() => false),
      pingRedis(redis).catch(() => false),
    ]);
    return { database, redis: redisOk };
  },
};

const app = await createApp(deps);

app.listen(cfg.PORT);

const apiOrigin = new URL(cfg.BETTER_AUTH_URL);
logger.info("api listening", {
  port: cfg.PORT,
  env: cfg.NODE_ENV,
  docs: new URL(DOCS_PATH, apiOrigin).href,
  authReference: new URL(AUTH_REFERENCE_PATH, apiOrigin).href,
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutting down", { signal });

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  await app.stop();
  await sql.end({ timeout: 5 });
  redis.disconnect();

  logger.info("stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
