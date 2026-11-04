import { ROLE_PERMISSIONS } from "@wasanni/contracts";
import type { Action } from "@wasanni/contracts";

export type ScopeGroup = {
  label: string;
  actions: readonly Action[];
  scopes: string[];
};

export const SCOPE_GROUPS: ScopeGroup[] = Object.entries(ROLE_PERMISSIONS.owner)
  .filter(([, actions]) => actions.length > 0)
  .map(([resource, actions]) => ({
    label: resource,
    actions,
    scopes: actions.map((action) => `${resource}:${action}`),
  }));

export const ALL_SCOPES = SCOPE_GROUPS.flatMap((group) => group.scopes);

export const DEFAULT_SCOPES = [
  "session:create",
  "session:read",
  "score:create",
  "score:read",
];
