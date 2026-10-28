import type { RoleName } from "./role-types";

const ROLE_RANK: Record<RoleName, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function rank(role: string): number {
  return ROLE_RANK[role as RoleName] ?? 0;
}

export function atLeast(role: string, minimum: RoleName): boolean {
  return rank(role) >= ROLE_RANK[minimum];
}

export function canManageMembers(role: string): boolean {
  return atLeast(role, "admin");
}

export function canChangeRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole === "member";
  return false;
}
