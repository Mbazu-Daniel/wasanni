import {
  CreateWebhookBody,
  CreatedWebhook,
  OrganizationIdParams,
  OrganizationWebhookIdParams,
  OrgWebhookList,
  PERMISSION,
  UpdateWebhookBody,
  WebhookConfigList,
  WebhookConfigSingle,
  WebhookDeliveryList,
  WebhookIdParams,
  WebhookParams,
  WebhookTestAccepted,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { WebhookRouteDeps } from "./types.ts";

export const createWebhookRoutes = <T extends PrincipalApi>(
  api: T,
  { service, secrets, dispatcher }: WebhookRouteDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/webhooks",
      async ({ principal }) => ({
        webhooks: await service.listForOrganization(organizationScope(principal)),
      }),
      {
        organizationAuth: PERMISSION.webhookRead,
        params: OrganizationIdParams,
        response: { 200: OrgWebhookList },
        detail: { tags: ["webhooks"], summary: "List every webhook of an organization" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/webhooks/:webhookId/deliveries",
      async ({ principal, params }) => ({
        deliveries: await service.listDeliveries(
          organizationScope(principal),
          params.webhookId,
        ),
      }),
      {
        organizationAuth: PERMISSION.webhookRead,
        params: OrganizationWebhookIdParams,
        response: { 200: WebhookDeliveryList },
        detail: { tags: ["webhooks"], summary: "List the recent deliveries of a webhook" },
      },
    )
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
    .post(
      "/api/v1/organizations/:organizationId/platforms/:platformId/webhooks/:webhookId/test",
      async ({ principal, params, status }) => {
        const scope = organizationScope(principal);

        await service.get(scope, params.platformId, params.webhookId);

        const queued = await dispatcher.dispatch({
          organizationId: scope.organizationId,
          platformId: params.platformId,
          eventType: "webhook.test",
          payload: { webhookId: params.webhookId },
        });

        return status(202, { queued });
      },
      {
        organizationAuth: PERMISSION.webhookRead,
        params: WebhookIdParams,
        response: { 202: WebhookTestAccepted },
        detail: { tags: ["webhooks"], summary: "Send a test event to a webhook" },
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
