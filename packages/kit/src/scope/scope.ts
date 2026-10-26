import { badRequest } from "../errors/errors.ts";
import type { Principal } from "../tenancy/types.ts";
import type { Scope } from "./types.ts";

export function workspaceScope(principal: Principal | null | undefined): Scope {
  const workspaceId = principal?.workspaceId.trim() ?? "";

  if (workspaceId === "") {
    throw badRequest("workspace scope requires a principal with a workspace");
  }

  return { workspaceId };
}
