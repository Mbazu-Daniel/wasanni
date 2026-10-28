import {
  createLogger,
  createObjectStorage,
  createRedis,
  createRedisSessionEventStore,
  preflight,
  readEnv,
  readStorageConfig,
} from "@wasanni/kit";
import { createDb } from "@wasanni/db";
import {
  closeQueues,
  createQueueConnection,
  createQueues,
  JOB,
  QUEUE,
} from "@wasanni/jobs";
import { createAuditService } from "../../api/src/modules/audit/service.ts";
import { createWebhookWorker } from "./jobs/webhook.worker.ts";
import { createEmailWorker } from "./jobs/email.worker.ts";
import { createArchiveWorker } from "./jobs/archive.worker.ts";
import { createDefaultWorker } from "./jobs/default.worker.ts";

const cfg = readEnv();

const logger = createLogger({
  level: cfg.LOG_LEVEL,
  pretty: cfg.NODE_ENV !== "production",
  bindings: { service: "worker" },
});

const checks = await preflight(cfg, logger);
logger.info("preflight ready", checks);

const { db, sql } = createDb(cfg.DATABASE_URL, { max: cfg.DB_POOL_MAX_WORKER });
const redis = createRedis(cfg.REDIS_URL);
const storage = createObjectStorage(readStorageConfig(cfg));
const events = createRedisSessionEventStore(redis);
const audit = createAuditService(db, logger);

const connection = createQueueConnection(cfg.REDIS_URL);
const queues = createQueues(connection);

const workers = [
  createWebhookWorker(connection, db, cfg, logger),
  createEmailWorker(connection, cfg, logger),
  createArchiveWorker(connection, { db, storage, events, audit, env: cfg, logger }),
  createDefaultWorker(connection, db, redis),
];

for (const worker of workers) {
  worker.on("completed", (job) => {
    logger.debug("job.completed", { queue: worker.name, job: job.name, id: job.id });
  });

  worker.on("failed", (job, error) => {
    logger.error("job.failed", {
      queue: worker.name,
      job: job?.name,
      id: job?.id,
      attempts: job?.attemptsMade,
      err: error,
    });
  });

  worker.on("error", (error) => {
    logger.error("worker.error", { queue: worker.name, err: error });
  });
}

await queues.archive.upsertJobScheduler(
  "score-pack",
  { every: 5 * 60 * 1000 },
  { name: JOB.SCORE_PACK, data: {} },
);

await queues.archive.upsertJobScheduler(
  "score-partition-maintenance",
  { pattern: "5 * * * *", tz: "UTC" },
  { name: JOB.SCORE_ENSURE_PARTITIONS, data: {} },
);

await queues.archive.upsertJobScheduler(
  "score-archive",
  { pattern: cfg.SCORE_ARCHIVE_CRON, tz: "UTC" },
  { name: JOB.SCORE_ARCHIVE_PARTITIONS, data: {} },
);

await queues.default.upsertJobScheduler(
  "session-sweep",
  { every: 60 * 1000 },
  { name: JOB.SESSION_SWEEP, data: {} },
);

await queues.default.upsertJobScheduler(
  "usage-flush",
  { pattern: "* * * * *", tz: "UTC" },
  { name: JOB.USAGE_FLUSH, data: {} },
);

logger.info("worker started", {
  queues: [QUEUE.WEBHOOKS, QUEUE.EMAIL, QUEUE.ARCHIVE, QUEUE.DEFAULT],
  repeatable: [
    JOB.SCORE_PACK,
    JOB.SCORE_ENSURE_PARTITIONS,
    JOB.SCORE_ARCHIVE_PARTITIONS,
    JOB.SESSION_SWEEP,
    JOB.USAGE_FLUSH,
  ],
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutting down", { signal });

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 20_000);
  forceExit.unref();

  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueues(queues);
  connection.disconnect();
  redis.disconnect();
  await sql.end({ timeout: 5 });

  logger.info("stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
