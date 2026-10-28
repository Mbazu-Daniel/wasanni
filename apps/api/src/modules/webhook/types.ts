import type { WebhookConfigView, WebhookEvent } from "@wasanni/contracts";
import type { Db } from "@wasanni/db";
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
  dispatch(input: WebhookDispatchInput): Promise<number>;
};

export type CreatedWebhook = { webhook: WebhookConfigView; secret: string };

export type WebhookService = ReturnType<typeof createWebhookService>;

export type WebhookSecretService = ReturnType<typeof createWebhookSecretService>;

export type WebhookModuleDeps = {
  db: Db;
  encryptionKey: string;
};

export type WebhookRouteDeps = {
  service: WebhookService;
  secrets: WebhookSecretService;
};
