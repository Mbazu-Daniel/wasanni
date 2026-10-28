import type { organizationRole } from "@wasanni/db/schema";
import type { createRoleService } from "./service.ts";

export type OrganizationRoleRow = (typeof organizationRole.$inferSelect);

export type RoleService = ReturnType<typeof createRoleService>;

export type RoleRouteDeps = {
  service: RoleService;
};
