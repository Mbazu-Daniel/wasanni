import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { activeMember, member, user } from "@wasanni/db/schema";
import { OrganizationMemberView } from "@wasanni/contracts";
import { notFound } from "@wasanni/kit";

const columns = {
  memberId: member.id,
  userId: user.id,
  email: user.email,
  name: user.name,
  image: user.image,
  role: member.role,
  displayName: member.displayName,
  joinedAt: member.createdAt,
} as const;

type MemberRow = {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  displayName: string | null;
  joinedAt: Date;
};

const toView = (row: MemberRow): OrganizationMemberView => ({
  ...row,
  joinedAt: row.joinedAt.toISOString(),
});

const activeIn = (organizationId: string) =>
  and(eq(member.organizationId, organizationId), activeMember);

export function memberService(db: Db) {
  return {
    async getForOrganization(organizationId: string): Promise<OrganizationMemberView[]> {
      const rows = await db
        .select(columns)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(activeIn(organizationId))
        .orderBy(desc(member.createdAt));

      return rows.map(toView);
    },

    async getForUser(
      organizationId: string,
      userId: string,
    ): Promise<OrganizationMemberView | null> {
      const [row] = await db
        .select(columns)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(activeIn(organizationId), eq(member.userId, userId)))
        .limit(1);

      return row === undefined ? null : toView(row);
    },

    async getById(
      organizationId: string,
      memberId: string,
    ): Promise<OrganizationMemberView | null> {
      const [row] = await db
        .select(columns)
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(activeIn(organizationId), eq(member.id, memberId)))
        .limit(1);

      return row === undefined ? null : toView(row);
    },

    async setDisplayName(input: {
      organizationId: string;
      memberId: string;
      displayName: string;
    }): Promise<void> {
      const updated = await db
        .update(member)
        .set({ displayName: input.displayName })
        .where(and(activeIn(input.organizationId), eq(member.id, input.memberId)))
        .returning({ id: member.id });

      if (updated.length === 0) throw notFound("member not found");
    },

    async remove(organizationId: string, memberId: string): Promise<void> {
      const updated = await db
        .update(member)
        .set({ deletedAt: new Date() })
        .where(and(activeIn(organizationId), eq(member.id, memberId)))
        .returning({ id: member.id });

      if (updated.length === 0) throw notFound("member not found");
    },
  };
}

export type MemberService = ReturnType<typeof memberService>;
