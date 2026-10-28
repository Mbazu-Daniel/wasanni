import type { PrincipalApi } from "../../plugins/types.ts";
import { createWebhookRoutes } from "./webhook.routes.ts";
import { createWebhookSecretService } from "./webhook-secret.service.ts";
import { createWebhookService } from "./webhook.service.ts";
import type { WebhookModuleDeps } from "./types.ts";

export const createWebhooksRoutes = <T extends PrincipalApi>(
  api: T,
  deps: WebhookModuleDeps,
) => {
  const service = createWebhookService(deps.db);
  const secrets = createWebhookSecretService(deps.db, deps.encryptionKey);

  createWebhookRoutes(api, { service, secrets, dispatcher: deps.dispatcher });

  return api;
};
