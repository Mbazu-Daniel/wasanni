import { eq } from "drizzle-orm";
import type { RolePermission } from "@wasanni/contracts";
import { organizationRole } from "./schema/organization/organization-role.ts";
import type { Db } from "./types.ts";

export type OrganizationRoles = Record<string, RolePermission>;

export async function readOrganizationRoles(
  db: Db,
  organizationId: string,
): Promise<OrganizationRoles> {
  const rows = await db
    .select({
      role: organizationRole.role,
      permission: organizationRole.permission,
    })
    .from(organizationRole)
    .where(eq(organizationRole.organizationId, organizationId));

  const roles: OrganizationRoles = {};

  for (const row of rows) roles[row.role] = row.permission;

  return roles;
}
