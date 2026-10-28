import { Worker } from "bullmq";
import type { Db } from "@wasanni/db";
import { JOB, QUEUE, type QueueConnection } from "@wasanni/jobs";
import { InternalServerError, type Redis } from "@wasanni/kit";
import { createSweepProcessor } from "../processors/sweep.processor.ts";
import { createUsageFlushProcessor } from "../processors/usage-flush.processor.ts";

export function createDefaultWorker(connection: QueueConnection, db: Db, redis: Redis) {
  const sweep = createSweepProcessor(db);
  const flushUsage = createUsageFlushProcessor(db, redis);

  return new Worker(
    QUEUE.DEFAULT,
    async (job) => {
      if (job.name === JOB.SESSION_SWEEP) {
        return sweep();
      }
      if (job.name === JOB.USAGE_FLUSH) {
        return flushUsage();
      }
      throw new InternalServerError(`unexpected default job: ${job.name}`);
    },
    { connection, concurrency: 1 },
  );
}
