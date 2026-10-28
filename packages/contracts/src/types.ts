import { ACTIONS, RESOURCES, ROLE_NAMES } from "./constants.ts";

export type Resource = (typeof RESOURCES)[number];

export type Action = (typeof ACTIONS)[number];

export type Permission = `${Resource}:${Action}`;

export type RoleName = (typeof ROLE_NAMES)[number];

export type PermissionGrant = Record<string, readonly string[] | undefined>;
