import {
  CreateWebhookBody,
  CreatedWebhook,
  PERMISSION,
  UpdateWebhookBody,
  WebhookConfigList,
  WebhookConfigSingle,
  WebhookIdParams,
  WebhookParams,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { WebhookSecretService } from "./webhook-secret.service.ts";
import type { WebhookService } from "./webhook.service.ts";

type WebhookDeps = {
  service: WebhookService;
  secrets: WebhookSecretService;
};

export const createWebhookRoutes = <T extends PrincipalApi>(
  api: T,
  { service, secrets }: WebhookDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks",
      async ({ principal, params }) => ({
        webhooks: await service.list(
          organizationScope(principal),
          params.platformId,
        ),
      }),
      {
        organizationAuth: PERMISSION.webhookRead,
        params: WebhookParams,
        response: { 200: WebhookConfigList },
        detail: { tags: ["webhooks"], summary: "List the webhooks of a platform" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks",
      async ({ principal, params, body, status }) => {
        const created = await secrets.create(
          organizationScope(principal),
          params.platformId,
          body,
        );
        return status(201, created);
      },
      {
        organizationAuth: PERMISSION.webhookCreate,
        params: WebhookParams,
        body: CreateWebhookBody,
        response: { 201: CreatedWebhook },
        detail: { tags: ["webhooks"], summary: "Create a webhook" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks/:webhookId",
      async ({ principal, params }) => ({
        webhook: await service.get(
          organizationScope(principal),
          params.platformId,
          params.webhookId,
        ),
      }),
      {
        organizationAuth: PERMISSION.webhookRead,
        params: WebhookIdParams,
        response: { 200: WebhookConfigSingle },
        detail: { tags: ["webhooks"], summary: "Read one webhook" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks/:webhookId",
      async ({ principal, params, body }) => ({
        webhook: await service.update(
          organizationScope(principal),
          params.platformId,
          params.webhookId,
          body,
        ),
      }),
      {
        organizationAuth: PERMISSION.webhookUpdate,
        params: WebhookIdParams,
        body: UpdateWebhookBody,
        response: { 200: WebhookConfigSingle },
        detail: { tags: ["webhooks"], summary: "Update a webhook" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks/:webhookId/rotate-secret",
      async ({ principal, params }) =>
        secrets.rotate(
          organizationScope(principal),
          params.platformId,
          params.webhookId,
        ),
      {
        organizationAuth: PERMISSION.webhookUpdate,
        params: WebhookIdParams,
        response: { 200: CreatedWebhook },
        detail: { tags: ["webhooks"], summary: "Rotate the secret of a webhook" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks/:webhookId",
      async ({ principal, params, status }) => {
        await service.remove(
          organizationScope(principal),
          params.platformId,
          params.webhookId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.webhookDelete,
        params: WebhookIdParams,
        detail: { tags: ["webhooks"], summary: "Delete a webhook" },
      },
    );
