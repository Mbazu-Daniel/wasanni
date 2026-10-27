import { Worker } from "bullmq";
import type { Env, Logger } from "@wasanni/kit";
import { JOB, QUEUE, type EmailJob, type QueueConnection } from "@wasanni/jobs";
import { createEmailProcessor } from "../processors/email.processor.ts";

export function createEmailWorker(
  connection: QueueConnection,
  env: Env,
  logger: Logger,
) {
  const send = createEmailProcessor(env, logger);

  return new Worker<EmailJob>(
    QUEUE.EMAIL,
    async (job) => {
      if (job.name !== JOB.EMAIL_SEND) {
        throw new Error(`unexpected email job: ${job.name}`);
      }
      return send(job.data);
    },
    {
      connection,
      concurrency: 10,
      limiter: { max: 50, duration: 1000 },
    },
  );
}
