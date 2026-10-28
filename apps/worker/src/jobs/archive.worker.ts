import { Worker } from "bullmq";
import type { Db } from "@wasanni/db";
import type { ObjectStorage, SessionEventStore } from "@wasanni/kit";
import {
  JOB,
  QUEUE,
  type QueueConnection,
  type ScorePackJob,
  type ScoreRecheckJob,
} from "@wasanni/jobs";
import { createPackProcessor } from "../processors/pack.processor.ts";
import { createRecheckProcessor } from "../processors/recheck.processor.ts";

export function createArchiveWorker(
  connection: QueueConnection,
  db: Db,
  storage: ObjectStorage,
  events: SessionEventStore,
) {
  const pack = createPackProcessor(db, storage, events);
  const recheck = createRecheckProcessor(db);

  return new Worker(
    QUEUE.ARCHIVE,
    async (job) => {
      if (job.name === JOB.SCORE_PACK) {
        return pack(job.data as ScorePackJob);
      }
      if (job.name === JOB.SCORE_RECHECK) {
        return recheck(job.data as ScoreRecheckJob);
      }
      throw new Error(`unexpected archive job: ${job.name}`);
    },
    { connection, concurrency: 2 },
  );
}
