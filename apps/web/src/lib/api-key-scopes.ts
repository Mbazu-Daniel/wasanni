import { PLATFORM_ONLY_RESOURCES, ROLE_PERMISSIONS } from "@wasanni/contracts";
import type { Action } from "@wasanni/contracts";

export type ScopeGroup = {
  label: string;
  actions: readonly Action[];
  scopes: string[];
};

const platformOnly = PLATFORM_ONLY_RESOURCES as readonly string[];

export const SCOPE_GROUPS: ScopeGroup[] = Object.entries(ROLE_PERMISSIONS.owner)
  .filter(([resource, actions]) => actions.length > 0 && !platformOnly.includes(resource))
  .map(([resource, actions]) => ({
    label: resource,
    actions,
    scopes: actions.map((action) => `${resource}:${action}`),
  }));

export const ALL_SCOPES = SCOPE_GROUPS.flatMap((group) => group.scopes);

export const DEFAULT_SCOPES = ["platform:read", "game:read", "tournament:read"];
