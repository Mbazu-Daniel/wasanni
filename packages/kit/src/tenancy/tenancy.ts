import { forbidden, unauthenticated } from "../errors/errors.ts";
import type { Principal } from "./types.ts";

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
