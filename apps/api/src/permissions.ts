import { createAccessControl } from "better-auth/plugins/access";
import {
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  flattenPermissions,
  rolesIn,
  type Action,
  type Resource,
} from "@wasanni/contracts";
import { forbidden, unauthenticated, type Principal } from "@wasanni/kit";

const resolveResourceActions = (resource: Resource): Action[] => {
  const actions = new Set<Action>();
  for (const role of ROLE_NAMES) {
    for (const action of ROLE_PERMISSIONS[role][resource]) actions.add(action);
  }
  return [...actions];
};

const statement: { [K in Resource]: Action[] } = {
  organization: resolveResourceActions("organization"),
  member: resolveResourceActions("member"),
  invitation: resolveResourceActions("invitation"),
  platform: resolveResourceActions("platform"),
  apiKey: resolveResourceActions("apiKey"),
  game: resolveResourceActions("game"),
  gameFile: resolveResourceActions("gameFile"),
  assignment: resolveResourceActions("assignment"),
  gameConfig: resolveResourceActions("gameConfig"),
  template: resolveResourceActions("template"),
  session: resolveResourceActions("session"),
  score: resolveResourceActions("score"),
  webhook: resolveResourceActions("webhook"),
};

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole(ROLE_PERMISSIONS.owner),
  admin: ac.newRole(ROLE_PERMISSIONS.admin),
  member: ac.newRole(ROLE_PERMISSIONS.member),
};

const EMPTY: ReadonlySet<string> = new Set();

export function permissionsForRole(role: string): ReadonlySet<string> {
  const names = rolesIn(role);
  if (names.length === 0) return EMPTY;

  const permissions = new Set<string>();
  for (const name of names) {
    for (const permission of flattenPermissions(ROLE_PERMISSIONS[name])) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function requirePermission(
  principal: Principal | null | undefined,
  permission: string,
): Principal {
  if (!principal) throw unauthenticated();
  if (!principal.permissions.has(permission)) {
    throw forbidden(`missing permission: ${permission}`);
  }
  return principal;
}
