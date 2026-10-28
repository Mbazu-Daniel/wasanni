import type { Db } from "@wasanni/db";
import type { PrincipalApi } from "../../plugins/principal.ts";
import { createWebhookRoutes } from "./webhook.routes.ts";
import { createWebhookSecretService } from "./webhook-secret.service.ts";
import { createWebhookService } from "./webhook.service.ts";

type WebhookDeps = {
  db: Db;
  encryptionKey: string;
};

export const createWebhooksRoutes = <T extends PrincipalApi>(
  api: T,
  deps: WebhookDeps,
) => {
  const service = createWebhookService(deps.db);
  const secrets = createWebhookSecretService(deps.db, deps.encryptionKey);

  createWebhookRoutes(api, { service, secrets });

  return api;
};
