import { ACTIONS, RESOURCES, ROLE_NAMES } from "./constants.ts";
import type { PermissionGrant, RoleName } from "./types.ts";

export function rolesIn(role: string): RoleName[] {
  return role
    .split(",")
    .map((name) => name.trim())
    .filter((name): name is RoleName => (ROLE_NAMES as readonly string[]).includes(name));
}

export function flattenPermissions(grant: PermissionGrant): ReadonlySet<string> {
  const permissions = new Set<string>();

  for (const [resource, actions] of Object.entries(grant)) {
    if (!Array.isArray(actions)) continue;
    for (const action of actions) permissions.add(`${resource}:${action}`);
  }

  return permissions;
}

export function listUnknownPermissions(grant: PermissionGrant): string[] {
  const unknown: string[] = [];

  for (const [resource, actions] of Object.entries(grant)) {
    if (!(RESOURCES as readonly string[]).includes(resource)) {
      unknown.push(resource);
      continue;
    }

    if (!Array.isArray(actions)) continue;

    for (const action of actions) {
      if (!(ACTIONS as readonly string[]).includes(action)) {
        unknown.push(`${resource}:${action}`);
      }
    }
  }

  return unknown;
}

export function parsePermissionGrant(raw: string | null): PermissionGrant {
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return parsed as PermissionGrant;
}
