import {
  ApiKeyIdParams,
  ApiKeyList,
  ApiKeySingle,
  CreateApiKeyBody,
  CreatedApiKeySingle,
  OrgApiKeyList,
  OrganizationIdParams,
  PERMISSION,
  PlatformIdParams,
  UpdateApiKeyBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { ApiKeyDeps } from "./types.ts";

export const createApiKeyRoutes = <T extends PrincipalApi>(api: T, { service }: ApiKeyDeps) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/keys",
      async ({ principal }) => ({
        keys: await service.listForOrganization(organizationScope(principal)),
      }),
      {
        organizationAuth: PERMISSION.apiKeyRead,
        params: OrganizationIdParams,
        response: { 200: OrgApiKeyList },
        detail: { tags: ["api-keys"], summary: "List every api key of an organization" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/platforms/:platformId/keys",
      async ({ principal, params }) => ({
        keys: await service.list(organizationScope(principal), params.platformId),
      }),
      {
        organizationAuth: PERMISSION.apiKeyRead,
        params: PlatformIdParams,
        response: { 200: ApiKeyList },
        detail: { tags: ["api-keys"], summary: "List the api keys of a platform" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/platforms/:platformId/keys",
      async ({ principal, params, body, status }) => {
        const created = await service.create(organizationScope(principal), {
          platformId: params.platformId,
          ...body,
        });
        return status(201, { apiKey: created });
      },
      {
        organizationAuth: PERMISSION.apiKeyCreate,
        params: PlatformIdParams,
        body: CreateApiKeyBody,
        response: { 201: CreatedApiKeySingle },
        detail: { tags: ["api-keys"], summary: "Create an api key for a platform" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/platforms/:platformId/keys/:keyId",
      async ({ principal, params, body }) => ({
        apiKey: await service.update(
          organizationScope(principal),
          params.platformId,
          params.keyId,
          body,
        ),
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
      "/api/v1/organizations/:organizationId/platforms/:platformId/keys/:keyId",
      async ({ principal, params, status }) => {
        await service.remove(
          organizationScope(principal),
          params.platformId,
          params.keyId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.apiKeyDelete,
        params: ApiKeyIdParams,
        detail: { tags: ["api-keys"], summary: "Delete an api key" },
      },
    );
