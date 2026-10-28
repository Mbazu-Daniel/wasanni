import type IORedis from "ioredis";
import type { EmailPurpose } from "@wasanni/kit";
import type { createEnqueuer } from "./enqueue.ts";
import type { createQueues } from "./queues.ts";

export type QueueConnection = IORedis;

export type Queues = ReturnType<typeof createQueues>;

export type Enqueuer = ReturnType<typeof createEnqueuer>;

export type WebhookDeliveryJob = {
  webhookId: string;
  organizationId: string;
  platformId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
};

export type EmailJob = {
  to: string;
  subject: string;
  url: string;
  purpose: EmailPurpose;
};

export type ScorePackJob = {
  organizationId?: string;
  limit?: number;
};

export type ScoreRecheckJob = {
  organizationId: string;
  configId: string;
};

export type GameBundleJob = {
  organizationId: string;
  fileId: string;
};
