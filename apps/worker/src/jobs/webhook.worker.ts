import { Worker } from "bullmq";
import type { Db } from "@wasanni/db";
import { InternalServerError, type Env, type Logger } from "@wasanni/kit";
import { JOB, QUEUE, type QueueConnection, type WebhookDeliveryJob } from "@wasanni/jobs";
import { createWebhookProcessor } from "../processors/webhook.processor.ts";

export function createWebhookWorker(
  connection: QueueConnection,
  db: Db,
  env: Env,
  logger: Logger,
) {
  const deliver = createWebhookProcessor(db, env, logger);

  return new Worker<WebhookDeliveryJob>(
    QUEUE.WEBHOOKS,
    async (job) => {
      if (job.name !== JOB.WEBHOOK_DELIVER) {
        throw new InternalServerError(`unexpected webhook job: ${job.name}`);
      }

      return deliver(job.data);
    },
    {
      connection,
      concurrency: 20,
      limiter: { max: 500, duration: 1000 },
    },
  );
}
