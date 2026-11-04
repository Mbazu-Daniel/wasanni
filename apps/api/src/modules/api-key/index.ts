import {
  ApiKeyIdParams,
  ApiKeyList,
  ApiKeySingle,
  CreateApiKeyBody,
  CreatedApiKeySingle,
  OrganizationIdParams,
  PERMISSION,
  UpdateApiKeyBody,
} from "@wasanni/contracts";
import { organizationScope, UnauthorizedError } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ApiKeyDeps } from "./types.ts";

export const createApiKeyRoutes = <T extends PrincipalApi>(api: T, { service }: ApiKeyDeps) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/keys",
      async ({ principal }) => ({
        keys: await service.list(organizationScope(principal)),
      }),
      {
        organizationAuth: PERMISSION.apiKeyRead,
        params: OrganizationIdParams,
        response: { 200: ApiKeyList },
        detail: { tags: ["api-keys"], summary: "List every api key of an organization" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/keys",
      async ({ principal, body, status }) => {
        if (principal.kind !== "user") {
          throw new UnauthorizedError("an api key cannot create api keys");
        }
        const created = await service.create(
          organizationScope(principal),
          principal.userId,
          body,
        );
        return status(201, { apiKey: created });
      },
      {
        organizationAuth: PERMISSION.apiKeyCreate,
        params: OrganizationIdParams,
        body: CreateApiKeyBody,
        response: { 201: CreatedApiKeySingle },
        detail: { tags: ["api-keys"], summary: "Create an api key for an organization" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/keys/:keyId",
      async ({ principal, params, body }) => ({
        apiKey: await service.update(organizationScope(principal), params.keyId, body),
      }),
      {
        organizationAuth: PERMISSION.apiKeyUpdate,
        params: ApiKeyIdParams,
        body: UpdateApiKeyBody,
        response: { 200: ApiKeySingle },
        detail: { tags: ["api-keys"], summary: "Rename or revoke an api key" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/keys/:keyId",
      async ({ principal, params, status }) => {
        await service.remove(organizationScope(principal), params.keyId);
        return status(204);
      },
      {
        organizationAuth: PERMISSION.apiKeyDelete,
        params: ApiKeyIdParams,
        detail: { tags: ["api-keys"], summary: "Delete an api key" },
      },
    );
