import {
  CreateRoleBody,
  OrganizationIdParams,
  PERMISSION,
  RoleList,
  RoleNameParams,
  RoleSingle,
  UpdateRoleBody,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import type { RoleRouteDeps } from "./types.ts";

export const createRoleRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: RoleRouteDeps,
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/roles",
      async ({ principal }) => ({
        roles: await service.list(organizationScope(principal)),
      }),
      {
        organizationAuth: PERMISSION.roleRead,
        params: OrganizationIdParams,
        response: { 200: RoleList },
        detail: { tags: ["roles"], summary: "List the custom roles of an organization" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/roles",
      async ({ principal, body, status }) => {
        const created = await service.create(organizationScope(principal), body);
        return status(201, { role: created });
      },
      {
        organizationAuth: PERMISSION.roleCreate,
        params: OrganizationIdParams,
        body: CreateRoleBody,
        response: { 201: RoleSingle },
        detail: { tags: ["roles"], summary: "Create a custom role" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/roles/:role",
      async ({ principal, params, body }) => ({
        role: await service.update(organizationScope(principal), params.role, body),
      }),
      {
        organizationAuth: PERMISSION.roleUpdate,
        params: RoleNameParams,
        body: UpdateRoleBody,
        response: { 200: RoleSingle },
        detail: { tags: ["roles"], summary: "Change what a custom role may do" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/roles/:role",
      async ({ principal, params, status }) => {
        await service.remove(organizationScope(principal), params.role);
        return status(204);
      },
      {
        organizationAuth: PERMISSION.roleDelete,
        params: RoleNameParams,
        detail: { tags: ["roles"], summary: "Delete a custom role" },
      },
    );
