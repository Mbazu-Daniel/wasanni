import { BadRequestError } from "../exceptions/index.ts";
import type { GameSessionPrincipal, Principal } from "../tenancy/types.ts";
import type { Scope } from "./types.ts";

export function organizationScope(
  principal: Principal | GameSessionPrincipal | null | undefined,
): Scope {
  const organizationId = principal?.organizationId.trim() ?? "";

  if (organizationId === "") {
    throw new BadRequestError("organization scope requires a principal with an organization");
  }

  return { scoped: true, organizationId };
}
