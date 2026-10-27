import { createAccessControl } from "better-auth/plugins/access";
import {
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  flattenPermissions,
  rolesIn,
  type Action,
  type Resource,
} from "@wasanni/contracts";

const actionsUsedBy = (resource: Resource): Action[] => {
  const actions = new Set<Action>();
  for (const role of ROLE_NAMES) {
    for (const action of ROLE_PERMISSIONS[role][resource]) actions.add(action);
  }
  return [...actions];
};

const statement: { [K in Resource]: Action[] } = {
  organization: actionsUsedBy("organization"),
  member: actionsUsedBy("member"),
  invitation: actionsUsedBy("invitation"),
  platform: actionsUsedBy("platform"),
  apiKey: actionsUsedBy("apiKey"),
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
