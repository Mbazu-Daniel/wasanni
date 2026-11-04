import type { WebhookConfigView, WebhookEvent } from "@wasanni/contracts";
import type { Db, DbExecutor } from "@wasanni/db";
import type { webhookConfig } from "@wasanni/db/schema";
import type { createWebhookSecretService } from "./webhook-secret.service.ts";
import type { createWebhookService } from "./webhook.service.ts";

export type WebhookRow = (typeof webhookConfig.$inferSelect);

export type WebhookDispatchInput = {
  organizationId: string;
  platformId: string;
  eventType: WebhookEvent;
  payload: unknown;
};

export type WebhookDispatcher = {
  dispatch(input: WebhookDispatchInput, executor?: DbExecutor): Promise<void>;
};

export type CreatedWebhook = { webhook: WebhookConfigView; secret: string };

export type WebhookService = ReturnType<typeof createWebhookService>;

export type WebhookSecretService = ReturnType<typeof createWebhookSecretService>;

export type WebhookModuleDeps = {
  db: Db;
  encryptionKey: string;
  allowPrivateOutbound: boolean;
  dispatcher: WebhookDispatcher;
};

export type WebhookRouteDeps = {
  service: WebhookService;
  secrets: WebhookSecretService;
  dispatcher: WebhookDispatcher;
};
