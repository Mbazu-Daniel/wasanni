import { ROLE_PERMISSIONS, flattenPermissions, rolesIn } from "@wasanni/contracts";
import type { PermissionGrant, RoleName } from "@wasanni/contracts";
import { ForbiddenError, UnauthorizedError, type Principal } from "@wasanni/kit";

export function permissionsForRole(
  role: string,
  grants: Record<string, PermissionGrant> = {},
): ReadonlySet<string> {
  const permissions = new Set<string>();

  for (const name of rolesIn(role)) {
    const compiled: PermissionGrant | undefined = ROLE_PERMISSIONS[name as RoleName];
    const grant: PermissionGrant | undefined = grants[name] ?? compiled;

    if (grant === undefined) continue;

    for (const permission of flattenPermissions(grant)) permissions.add(permission);
  }

  return permissions;
}

export function requirePermission(
  principal: Principal | null | undefined,
  permission: string,
): Principal {
  if (!principal) throw new UnauthorizedError();
  if (!principal.permissions.has(permission)) {
    throw new ForbiddenError(`missing permission: ${permission}`);
  }
  return principal;
}
