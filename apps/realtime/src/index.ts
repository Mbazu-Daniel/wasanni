import { REALTIME_CLOSE } from "@wasanni/contracts";
import { createDb, pingDatabase } from "@wasanni/db";
import { createLogger, createRedis, isRedisReady, readEnv } from "@wasanni/kit";
import { createRealtimeApp } from "./app.ts";
import { createRoomBridge } from "./bridge.ts";
import { createRoomRegistry } from "./rooms.ts";
import { createScoreForwarder } from "./score.ts";
import pkg from "../package.json" with { type: "json" };

const cfg = readEnv();

const logger = createLogger({
  level: cfg.LOG_LEVEL,
  pretty: cfg.NODE_ENV !== "production",
  bindings: { service: "realtime" },
});

const { db, sql } = createDb(cfg.DATABASE_URL, { max: 5 });
const redis = createRedis(cfg.REDIS_URL);
const rooms = createRoomRegistry();
const bridge = createRoomBridge({ redis, rooms, logger });

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

void bridge.start().catch((error: Error) => {
  logger.error("realtime bridge failed to subscribe", { err: error.message });
});

const app = createRealtimeApp({
  db,
  logger,
  version: pkg.version,
  startedAt: Date.now(),
  rooms,
  bridge,
  maxMessageBytes: cfg.WS_MAX_MESSAGE_BYTES,
  idleTimeoutSeconds: cfg.WS_IDLE_TIMEOUT_SECONDS,
  forwardScore: createScoreForwarder({ apiUrl: cfg.API_INTERNAL_URL, logger }),
  ready: async () => {
    const [database, redisOk] = await Promise.all([
      pingDatabase(sql).catch(() => false),
      Promise.resolve(isRedisReady(redis)),
    ]);
    return { database, redis: redisOk };
  },
});

app.listen({ port: cfg.REALTIME_PORT });

logger.info("realtime listening", {
  port: cfg.REALTIME_PORT,
  env: cfg.NODE_ENV,
  idleTimeoutSeconds: cfg.WS_IDLE_TIMEOUT_SECONDS,
  maxMessageBytes: cfg.WS_MAX_MESSAGE_BYTES,
  api: cfg.API_INTERNAL_URL,
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

  rooms.closeAll(REALTIME_CLOSE.shutdown, "server shutting down");
  await app.stop();
  await bridge.stop();
  redis.disconnect();
  await sql.end({ timeout: 5 });

  logger.info("stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
