import type { Action, Permission, Resource, RoleName } from "./types.ts";

export const RESOURCES = [
  "organization",
  "member",
  "invitation",
  "platform",
  "apiKey",
  "game",
  "gameFile",
  "assignment",
  "gameConfig",
  "template",
  "session",
  "score",
  "webhook",
  "tournament",
  "match",
] as const;

export const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "cancel",
  "publish",
  "hide",
  "complete",
  "register",
  "seed",
  "start",
] as const;

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

  gameRead: "game:read",
  gameCreate: "game:create",
  gameUpdate: "game:update",
  gameDelete: "game:delete",
  gamePublish: "game:publish",

  gameFileRead: "gameFile:read",
  gameFileCreate: "gameFile:create",
  gameFileDelete: "gameFile:delete",

  assignmentRead: "assignment:read",
  assignmentCreate: "assignment:create",
  assignmentDelete: "assignment:delete",

  gameConfigRead: "gameConfig:read",
  gameConfigCreate: "gameConfig:create",
  gameConfigUpdate: "gameConfig:update",
  gameConfigDelete: "gameConfig:delete",

  templateRead: "template:read",
  templateCreate: "template:create",
  templateUpdate: "template:update",
  templateDelete: "template:delete",

  sessionRead: "session:read",
  sessionCreate: "session:create",
  sessionUpdate: "session:update",

  scoreRead: "score:read",
  scoreCreate: "score:create",
  scoreHide: "score:hide",

  webhookRead: "webhook:read",
  webhookCreate: "webhook:create",
  webhookUpdate: "webhook:update",
  webhookDelete: "webhook:delete",

  tournamentRead: "tournament:read",
  tournamentCreate: "tournament:create",
  tournamentUpdate: "tournament:update",
  tournamentDelete: "tournament:delete",
  tournamentRegister: "tournament:register",
  tournamentSeed: "tournament:seed",
  tournamentStart: "tournament:start",

  matchRead: "match:read",
  matchCreate: "match:create",
  matchUpdate: "match:update",
  matchDelete: "match:delete",
  matchComplete: "match:complete",
} as const satisfies Record<string, Permission>;

export const ROLE_NAMES = ["owner", "admin", "member"] as const;

export const OWNER_ROLE = "owner" as const satisfies RoleName;

const FULL_ACTIONS = ["create", "read", "update", "delete"] as const;

export const ROLE_PERMISSIONS: Record<RoleName, Record<Resource, readonly Action[]>> = {
  owner: {
    organization: ["read", "update", "delete"],
    member: FULL_ACTIONS,
    invitation: ["create", "read", "cancel"],
    platform: FULL_ACTIONS,
    apiKey: FULL_ACTIONS,
    game: ["create", "read", "update", "delete", "publish"],
    gameFile: ["create", "read", "delete"],
    assignment: ["create", "read", "delete"],
    gameConfig: FULL_ACTIONS,
    template: FULL_ACTIONS,
    session: ["create", "read", "update"],
    score: ["create", "read", "hide"],
    webhook: FULL_ACTIONS,
    tournament: [
      "create",
      "read",
      "update",
      "delete",
      "register",
      "seed",
      "start",
    ],
    match: ["create", "read", "update", "delete", "complete"],
  },
  admin: {
    organization: ["read", "update"],
    member: ["create", "read", "update"],
    invitation: ["create", "read", "cancel"],
    platform: ["create", "read", "update"],
    apiKey: FULL_ACTIONS,
    game: ["create", "read", "update", "delete", "publish"],
    gameFile: ["create", "read", "delete"],
    assignment: ["create", "read", "delete"],
    gameConfig: FULL_ACTIONS,
    template: FULL_ACTIONS,
    session: ["create", "read", "update"],
    score: ["create", "read", "hide"],
    webhook: FULL_ACTIONS,
    tournament: ["create", "read", "update", "register", "seed", "start"],
    match: ["create", "read", "update", "complete"],
  },
  member: {
    organization: ["read"],
    member: ["read"],
    invitation: ["read"],
    platform: ["read"],
    apiKey: ["read"],
    game: ["read"],
    gameFile: ["read"],
    assignment: ["read"],
    gameConfig: ["read"],
    template: ["read"],
    session: ["read"],
    score: ["read"],
    webhook: ["read"],
    tournament: ["read"],
    match: ["read"],
  },
};
