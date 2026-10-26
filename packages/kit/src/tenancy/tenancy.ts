import { forbidden, unauthenticated } from "../errors/errors.ts";
import type { Principal } from "./types.ts";

export function subjectId(principal: Principal): string {
  return principal.kind === "user" ? principal.userId : principal.platformId;
}

export function hasPermission(
  principal: Principal | null | undefined,
  permission: string,
): boolean {
  return principal != null && principal.permissions.has(permission);
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
