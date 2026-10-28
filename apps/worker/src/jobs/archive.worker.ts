import { Worker } from "bullmq";
import { InternalServerError } from "@wasanni/kit";
import {
  JOB,
  QUEUE,
  type QueueConnection,
  type ScorePackJob,
  type ScoreRecheckJob,
} from "@wasanni/jobs";
import { createPackProcessor } from "../processors/pack.processor.ts";
import { createRecheckProcessor } from "../processors/recheck.processor.ts";
import { createEnsurePartitionsProcessor } from "../processors/partition.processor.ts";
import { createArchivePartitionsProcessor } from "../processors/archive-partitions.processor.ts";
import type { ArchiveWorkerDeps } from "../types.ts";

export function createArchiveWorker(
  connection: QueueConnection,
  deps: ArchiveWorkerDeps,
) {
  const pack = createPackProcessor(deps.db, deps.storage, deps.events);
  const recheck = createRecheckProcessor(deps.db);
  const ensure = createEnsurePartitionsProcessor(deps.db, deps.env, deps.logger);
  const archive = createArchivePartitionsProcessor({
    db: deps.db,
    storage: deps.storage,
    audit: deps.audit,
    env: deps.env,
    logger: deps.logger,
  });

  return new Worker(
    QUEUE.ARCHIVE,
    async (job) => {
      if (job.name === JOB.SCORE_PACK) {
        return pack(job.data as ScorePackJob);
      }
      if (job.name === JOB.SCORE_RECHECK) {
        return recheck(job.data as ScoreRecheckJob);
      }
      if (job.name === JOB.SCORE_ENSURE_PARTITIONS) {
        return ensure();
      }
      if (job.name === JOB.SCORE_ARCHIVE_PARTITIONS) {
        return archive();
      }
      throw new InternalServerError(`unexpected archive job: ${job.name}`);
    },
    { connection, concurrency: 2 },
  );
}
