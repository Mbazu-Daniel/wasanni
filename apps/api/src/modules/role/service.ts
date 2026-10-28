import { asc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { organizationRole } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, ConflictError, NotFoundError } from "@wasanni/kit";
import {
  listUnknownPermissions,
  OWNER_ROLE,
  type CreateRoleBody,
  type RolePermission,
  type RoleView,
  type UpdateRoleBody,
} from "@wasanni/contracts";
import type { OrganizationRoleRow } from "./types.ts";

const normalizeRole = (role: string): string => role.trim().toLowerCase();

const toView = (row: OrganizationRoleRow): RoleView => ({
  role: row.role,
  permission: row.permission,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createRoleService(db: Db) {
  const assertUsable = (role: string, permission: RolePermission): void => {
    if (role === OWNER_ROLE) {
      throw new BadRequestError("the owner role cannot be redefined");
    }

    const unknown = listUnknownPermissions(permission);
    if (unknown.length > 0) {
      throw new BadRequestError(`unknown permission: ${unknown.join(", ")}`);
    }
  };

  return {
    async list(scope: Scope): Promise<RoleView[]> {
      const rows = await db
        .select()
        .from(organizationRole)
        .where(scopeTo(scope, organizationRole))
        .orderBy(asc(organizationRole.role));

      return rows.map(toView);
    },

    async create(scope: Scope, body: CreateRoleBody): Promise<RoleView> {
      const role = normalizeRole(body.role);

      assertUsable(role, body.permission);

      const [row] = await db
        .insert(organizationRole)
        .values({
          organizationId: scope.organizationId,
          role,
          permission: body.permission,
        })
        .onConflictDoNothing({
          target: [organizationRole.organizationId, organizationRole.role],
        })
        .returning();

      if (row === undefined) throw new ConflictError("that role already exists");

      return toView(row);
    },

    async update(
      scope: Scope,
      role: string,
      body: UpdateRoleBody,
    ): Promise<RoleView> {
      const name = normalizeRole(role);

      assertUsable(name, body.permission);

      const [row] = await db
        .update(organizationRole)
        .set({ permission: body.permission, updatedAt: new Date() })
        .where(
          scopeTo(
            scope,
            organizationRole,
            eq(organizationRole.organizationId, scope.organizationId),
            eq(organizationRole.role, name),
          ),
        )
        .returning();

      if (row === undefined) throw new NotFoundError("role not found");

      return toView(row);
    },

    async remove(scope: Scope, role: string): Promise<void> {
      const name = normalizeRole(role);

      if (name === OWNER_ROLE) {
        throw new BadRequestError("the owner role cannot be removed");
      }

      const rows = await db
        .delete(organizationRole)
        .where(
          scopeTo(
            scope,
            organizationRole,
            eq(organizationRole.organizationId, scope.organizationId),
            eq(organizationRole.role, name),
          ),
        )
        .returning({ role: organizationRole.role });

      if (rows.length === 0) throw new NotFoundError("role not found");
    },
  };
}
