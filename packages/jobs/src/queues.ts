import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE } from "./names.ts";
import type { QueueConnection, Queues } from "./types.ts";

export function createQueueConnection(redisUrl: string): QueueConnection {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

const BASE_OPTIONS = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 604_800, count: 5000 },
};

export function createQueues(connection: QueueConnection) {
  const webhooks = new Queue(QUEUE.WEBHOOKS, {
    connection,
    defaultJobOptions: {
      ...BASE_OPTIONS,
      attempts: 5,
      backoff: { type: "exponential", delay: 5000, jitter: 0.2 },
    },
  });

  const email = new Queue(QUEUE.EMAIL, {
    connection,
    defaultJobOptions: {
      ...BASE_OPTIONS,
      attempts: 4,
      backoff: { type: "exponential", delay: 3000, jitter: 0.2 },
    },
  });

  const archive = new Queue(QUEUE.ARCHIVE, {
    connection,
    defaultJobOptions: {
      ...BASE_OPTIONS,
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000, jitter: 0.2 },
    },
  });

  const defaultQueue = new Queue(QUEUE.DEFAULT, {
    connection,
    defaultJobOptions: BASE_OPTIONS,
  });

  return { webhooks, email, archive, default: defaultQueue };
}

export async function closeQueues(queues: Queues): Promise<void> {
  await Promise.all([
    queues.webhooks.close(),
    queues.email.close(),
    queues.archive.close(),
    queues.default.close(),
  ]);
}
