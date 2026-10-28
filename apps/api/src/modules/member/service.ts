import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { activeMember, member, user } from "@wasanni/db/schema";
import { readOrganizationRoles, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, ForbiddenError, NotFoundError } from "@wasanni/kit";
import { OWNER_ROLE, ROLE_NAMES, rolesIn, type MemberView } from "@wasanni/contracts";

import type { MemberRow } from "./types.ts";

const columns = {
  memberId: member.id,
  userId: user.id,
  email: user.email,
  memberName: member.name,
  accountName: user.name,
  avatar: member.avatar,
  role: member.role,
  joinedAt: member.createdAt,
} as const;

const toView = (row: MemberRow): MemberView => ({
  memberId: row.memberId,
  userId: row.userId,
  email: row.email,
  name: row.memberName ?? row.accountName,
  avatar: row.avatar,
  role: row.role,
  joinedAt: row.joinedAt.toISOString(),
});

const mayAssignRole = (actorRole: string, targetRole: string): boolean => {
  if (targetRole === OWNER_ROLE) return false;

  return rolesIn(actorRole).includes(OWNER_ROLE) || targetRole === "member";
}

export function createMemberService(db: Db) {
  return {
    async readSelf(scope: Scope, memberId: string): Promise<MemberView | null> {
      const [row] = await db
        .select(columns)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(scopeTo(scope, member, eq(member.id, memberId), activeMember))
        .limit(1);

      return row === undefined ? null : toView(row);
    },

    async list(scope: Scope): Promise<MemberView[]> {
      const rows = await db
        .select(columns)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(scopeTo(scope, member, activeMember))
        .orderBy(member.createdAt);

      return rows.map(toView);
    },

    async setName(
      scope: Scope,
      memberId: string,
      name: string,
    ): Promise<MemberView> {
      return this.write(scope, memberId, { name });
    },

    async setAvatar(scope: Scope, memberId: string, avatar: string): Promise<MemberView> {
      return this.write(scope, memberId, { avatar });
    },

    async setRole(
      scope: Scope,
      memberId: string,
      role: string,
      actorRole: string,
    ): Promise<MemberView> {
      const name = role.trim().toLowerCase();

      if (name === OWNER_ROLE) {
        throw new BadRequestError("the owner role is not assigned here");
      }

      if (!mayAssignRole(actorRole, name)) {
        throw new ForbiddenError(`you may not assign the role: ${name}`);
      }

      const grants = await readOrganizationRoles(db, scope.organizationId);
      const known = (ROLE_NAMES as readonly string[]).includes(name) || grants[name] !== undefined;

      if (!known) throw new BadRequestError(`unknown role: ${name}`);

      const [current] = await db
        .select({ role: member.role })
        .from(member)
        .where(scopeTo(scope, member, eq(member.id, memberId), activeMember))
        .limit(1);

      if (current === undefined) throw new NotFoundError("member not found");

      if (current.role.split(",").includes(OWNER_ROLE)) {
        throw new BadRequestError("the role of an owner is not changed here");
      }

      return this.write(scope, memberId, { role: name });
    },

    async write(
      scope: Scope,
      memberId: string,
      patch: { name?: string; avatar?: string; role?: string },
    ): Promise<MemberView> {
      const [row] = await db
        .update(member)
        .set(patch)
        .from(user)
        .where(
          scopeTo(
            scope,
            member,
            eq(member.userId, user.id),
            eq(member.id, memberId),
            activeMember,
          ),
        )
        .returning(columns);

      if (row === undefined) throw new NotFoundError("member not found");
      return toView(row);
    },
  };
}
