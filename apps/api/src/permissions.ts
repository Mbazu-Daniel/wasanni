import { createAccessControl } from "better-auth/plugins/access";
import {
  RESOURCES,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
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
};

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole(ROLE_PERMISSIONS.owner),
  admin: ac.newRole(ROLE_PERMISSIONS.admin),
  member: ac.newRole(ROLE_PERMISSIONS.member),
};

const EMPTY: ReadonlySet<string> = new Set();

export function permissionsForRole(role: string): ReadonlySet<string> {
  const known = role as (typeof ROLE_NAMES)[number];
  if (!(ROLE_NAMES as readonly string[]).includes(known)) return EMPTY;

  const permissions = new Set<string>();
  for (const resource of RESOURCES) {
    for (const action of ROLE_PERMISSIONS[known][resource]) {
      permissions.add(`${resource}:${action}`);
    }
  }
  return permissions;
}
