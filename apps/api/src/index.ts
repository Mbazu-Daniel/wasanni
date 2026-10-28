import {
  readEnv,
  createLogger,
  createRedis,
  createRedisSessionEventStore,
  isRedisReady,
} from "@wasanni/kit";
import { createDb, pingDatabase } from "@wasanni/db";
import {
  closeQueues,
  createEnqueuer,
  createQueueConnection,
  createQueues,
} from "@wasanni/jobs";
import { createApp } from "./app.ts";
import { AUTH_ROUTE_PREFIX, DOCS_PATH } from "./constants.ts";
import type { AppDeps } from "./types.ts";
import pkg from "../package.json" with { type: "json" };

const cfg = readEnv();

const logger = createLogger({
  level: cfg.LOG_LEVEL,
  pretty: cfg.NODE_ENV !== "production",
  bindings: { service: "api" },
});

const { db, sql } = createDb(cfg.DATABASE_URL, { max: 20 });
const redis = createRedis(cfg.REDIS_URL);
const events = createRedisSessionEventStore(redis);

const queueConnection = createQueueConnection(cfg.REDIS_URL);
const queues = createQueues(queueConnection);
const enqueuer = createEnqueuer(queues);

let redisWarned = false;

redis.on("error", (error: Error) => {
  if (redisWarned) {
    logger.debug("redis reconnect failed", { err: error.message });
    return;
  }
  redisWarned = true;
  logger.warn("redis unavailable", { err: error.message });
});

redis.on("ready", () => {
  redisWarned = false;
  logger.info("redis connected");
});

const deps: AppDeps = {
  logger,
  version: pkg.version,
  startedAt: Date.now(),
  corsOrigins: [cfg.PUBLIC_WEB_ORIGIN],
  db,
  env: cfg,
  events,
  enqueuer,
  ready: async () => {
    const [database, redisOk] = await Promise.all([
      pingDatabase(sql).catch(() => false),
      Promise.resolve(isRedisReady(redis)),
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
  openApi: `${new URL(AUTH_ROUTE_PREFIX, apiOrigin).href}/open-api/generate-schema`,
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
  await closeQueues(queues);
  queueConnection.disconnect();
  redis.disconnect();
  await sql.end({ timeout: 5 });

  logger.info("stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
