import { Worker } from "bullmq";
import type { Db } from "@wasanni/db";
import { JOB, QUEUE, type QueueConnection } from "@wasanni/jobs";
import { InternalServerError } from "@wasanni/kit";
import { createSweepProcessor } from "../processors/sweep.processor.ts";

export function createDefaultWorker(connection: QueueConnection, db: Db) {
  const sweep = createSweepProcessor(db);

  return new Worker(
    QUEUE.DEFAULT,
    async (job) => {
      if (job.name !== JOB.SESSION_SWEEP) {
        throw new InternalServerError(`unexpected default job: ${job.name}`);
      }
      return sweep();
    },
    { connection, concurrency: 1 },
  );
}
