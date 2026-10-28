import {
  CreatePlatformBody,
  OrganizationIdParams,
  PERMISSION,
  PlatformIdParams,
  PlatformList,
  PlatformSingle,
  UpdatePlatformBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/principal.ts";
import type { PlatformService } from "./service.ts";

type PlatformDeps = {
  service: PlatformService;
};

export const createPlatformRoutes = <T extends PrincipalApi>(api: T, { service }: PlatformDeps) =>
  api
    .get("/api/v1/organizations/:organizationId/platforms", async ({ principal }) => ({
      platforms: await service.list(organizationScope(principal)),
    }), {
      organizationAuth: PERMISSION.platformRead,
      params: OrganizationIdParams,
      response: { 200: PlatformList },
      detail: { tags: ["platforms"], summary: "List organization platforms" },
    })
    .get("/api/v1/organizations/:organizationId/platforms/:platformId", async ({
      principal,
      params,
    }) => ({
      platform: await service.get(organizationScope(principal), params.platformId),
    }), {
      organizationAuth: PERMISSION.platformRead,
      params: PlatformIdParams,
      response: { 200: PlatformSingle },
      detail: { tags: ["platforms"], summary: "Get one platform" },
    })
    .post("/api/v1/organizations/:organizationId/platforms", async ({
      principal,
      body,
      status,
    }) => {
      const created = await service.create(organizationScope(principal), body);
      return status(201, { platform: created });
    }, {
      organizationAuth: PERMISSION.platformCreate,
      body: CreatePlatformBody,
      response: { 201: PlatformSingle },
      detail: { tags: ["platforms"], summary: "Create a platform" },
    })
    .patch("/api/v1/organizations/:organizationId/platforms/:platformId", async ({
      principal,
      params,
      body,
    }) => ({
      platform: await service.update(organizationScope(principal), params.platformId, body),
    }), {
      organizationAuth: PERMISSION.platformUpdate,
      params: PlatformIdParams,
      body: UpdatePlatformBody,
      response: { 200: PlatformSingle },
      detail: { tags: ["platforms"], summary: "Update a platform" },
    })
    .delete("/api/v1/organizations/:organizationId/platforms/:platformId", async ({
      principal,
      params,
      status,
    }) => {
      await service.remove(organizationScope(principal), params.platformId);
      return status(204);
    }, {
      organizationAuth: PERMISSION.platformDelete,
      params: PlatformIdParams,
      detail: { tags: ["platforms"], summary: "Delete a platform" },
    });
