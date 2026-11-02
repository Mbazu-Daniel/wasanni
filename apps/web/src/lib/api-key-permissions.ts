import { SCOPE_GROUPS } from "./api-key-scopes.ts";

export function permissionsFromScopes(selected: ReadonlySet<string>): Record<string, string[]> {
  const permissions: Record<string, string[]> = {};

  for (const group of SCOPE_GROUPS) {
    const actions = group.actions.filter((action) => selected.has(`${group.label}:${action}`));

    if (actions.length > 0) permissions[group.label] = [...actions];
  }

  return permissions;
}
