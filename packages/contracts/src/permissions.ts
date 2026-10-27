export const RESOURCES = ["organization", "member", "invitation", "platform", "apiKey"] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ["create", "read", "update", "delete", "cancel"] as const;

export type Action = (typeof ACTIONS)[number];

export type Permission = `${Resource}:${Action}`;

export const PERMISSION = {
  organizationRead: "organization:read",
  organizationUpdate: "organization:update",
  organizationDelete: "organization:delete",

  memberRead: "member:read",
  memberCreate: "member:create",
  memberUpdate: "member:update",
  memberDelete: "member:delete",

  invitationRead: "invitation:read",
  invitationCreate: "invitation:create",
  invitationCancel: "invitation:cancel",

  platformRead: "platform:read",
  platformCreate: "platform:create",
  platformUpdate: "platform:update",
  platformDelete: "platform:delete",

  apiKeyRead: "apiKey:read",
  apiKeyCreate: "apiKey:create",
  apiKeyUpdate: "apiKey:update",
  apiKeyDelete: "apiKey:delete",
} as const satisfies Record<string, Permission>;

export const ROLE_NAMES = ["owner", "admin", "member"] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const OWNER_ROLE = "owner" as const satisfies RoleName;

export function rolesIn(role: string): RoleName[] {
  return role
    .split(",")
    .map((name) => name.trim())
    .filter((name): name is RoleName => (ROLE_NAMES as readonly string[]).includes(name));
}

const FULL = ["create", "read", "update", "delete"] as const;

export const ROLE_PERMISSIONS: Record<RoleName, Record<Resource, readonly Action[]>> = {
  owner: {
    organization: ["read", "update", "delete"],
    member: FULL,
    invitation: ["create", "read", "cancel"],
    platform: FULL,
    apiKey: FULL,
  },
  admin: {
    organization: ["read", "update"],
    member: ["create", "read", "update"],
    invitation: ["create", "read", "cancel"],
    platform: ["create", "read", "update"],
    apiKey: FULL,
  },
  member: {
    organization: ["read"],
    member: ["read"],
    invitation: ["read"],
    platform: ["read"],
    apiKey: ["read"],
  },
};

export type PermissionGrant = Record<string, readonly string[] | undefined>;

export function flattenPermissions(grant: PermissionGrant): ReadonlySet<string> {
  const permissions = new Set<string>();

  for (const [resource, actions] of Object.entries(grant)) {
    if (!Array.isArray(actions)) continue;
    for (const action of actions) permissions.add(`${resource}:${action}`);
  }

  return permissions;
}

export function unknownPermissions(grant: PermissionGrant): string[] {
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
