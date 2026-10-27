import { badRequest } from "../errors/errors.ts";
import type { Principal } from "../tenancy/types.ts";
import type { Scope } from "./types.ts";

export function organizationScope(principal: Principal | null | undefined): Scope {
  const organizationId = principal?.organizationId.trim() ?? "";

  if (organizationId === "") {
    throw badRequest("organization scope requires a principal with an organization");
  }

  return { scoped: true, organizationId };
}
