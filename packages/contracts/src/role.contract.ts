import { t, type UnwrapSchema } from "elysia";

export const RolePermissionModel = t.Record(t.String(), t.Array(t.String()));

export const RoleView = t.Object({
  role: t.String(),
  permission: RolePermissionModel,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type RoleView = UnwrapSchema<typeof RoleView>;

export const RoleList = t.Object({ roles: t.Array(RoleView) });
export type RoleList = UnwrapSchema<typeof RoleList>;

export const RoleSingle = t.Object({ role: RoleView });
export type RoleSingle = UnwrapSchema<typeof RoleSingle>;

export const CreateRoleBody = t.Object({
  role: t.String({ minLength: 1, maxLength: 40 }),
  permission: RolePermissionModel,
});
export type CreateRoleBody = UnwrapSchema<typeof CreateRoleBody>;

export const UpdateRoleBody = t.Object({
  permission: RolePermissionModel,
});
export type UpdateRoleBody = UnwrapSchema<typeof UpdateRoleBody>;

export const RoleNameParams = t.Object({
  organizationId: t.String(),
  role: t.String(),
});
export type RoleNameParams = UnwrapSchema<typeof RoleNameParams>;
