import { ROLE_PERMISSIONS, flattenPermissions, rolesIn } from "@wasanni/contracts";
import { forbidden, unauthenticated, type Principal } from "@wasanni/kit";

const EMPTY: ReadonlySet<string> = new Set();

export function permissionsForRole(role: string): ReadonlySet<string> {
  const names = rolesIn(role);
  if (names.length === 0) return EMPTY;

  const permissions = new Set<string>();
  for (const name of names) {
    for (const permission of flattenPermissions(ROLE_PERMISSIONS[name])) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function requirePermission(
  principal: Principal | null | undefined,
  permission: string,
): Principal {
  if (!principal) throw unauthenticated();
  if (!principal.permissions.has(permission)) {
    throw forbidden(`missing permission: ${permission}`);
  }
  return principal;
}
