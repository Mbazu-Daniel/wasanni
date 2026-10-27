import { createAccessControl } from "better-auth/plugins/access";
import { ROLE_NAMES, ROLE_PERMISSIONS } from "@wasanni/contracts";
import type { Action, Resource } from "@wasanni/contracts";

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
  tournament: resolveResourceActions("tournament"),
  match: resolveResourceActions("match"),
};

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole(ROLE_PERMISSIONS.owner),
  admin: ac.newRole(ROLE_PERMISSIONS.admin),
  member: ac.newRole(ROLE_PERMISSIONS.member),
};
