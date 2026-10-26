export const RESOURCES = ["organization", "member", "invitation"] as const;

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
} as const satisfies Record<string, Permission>;

export const ROLE_NAMES = ["owner", "admin", "member"] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

const FULL = ["create", "read", "update", "delete"] as const;

export const ROLE_PERMISSIONS: Record<RoleName, Record<Resource, readonly Action[]>> = {
  owner: {
    organization: ["read", "update", "delete"],
    member: FULL,
    invitation: ["create", "read", "cancel"],
  },
  admin: {
    organization: ["read", "update"],
    member: ["create", "read", "update"],
    invitation: ["create", "read", "cancel"],
  },
  member: {
    organization: ["read"],
    member: ["read"],
    invitation: ["read"],
  },
};
