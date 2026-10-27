import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { activeMember, member, user } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { notFound } from "@wasanni/kit";
import type { MemberView } from "@wasanni/contracts";

const columns = {
  memberId: member.id,
  userId: user.id,
  email: user.email,
  name: user.name,
  avatar: member.avatar,
  role: member.role,
  displayName: member.displayName,
  joinedAt: member.createdAt,
} as const;

type MemberRow = {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  displayName: string | null;
  joinedAt: Date;
};

const toView = (row: MemberRow): MemberView => ({
  ...row,
  joinedAt: row.joinedAt.toISOString(),
});

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

    async setDisplayName(
      scope: Scope,
      memberId: string,
      displayName: string,
    ): Promise<MemberView> {
      return this.write(scope, memberId, { displayName });
    },

    async setAvatar(scope: Scope, memberId: string, avatar: string): Promise<MemberView> {
      return this.write(scope, memberId, { avatar });
    },

    async write(
      scope: Scope,
      memberId: string,
      patch: { displayName?: string; avatar?: string },
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

      if (row === undefined) throw notFound("member not found");
      return toView(row);
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
