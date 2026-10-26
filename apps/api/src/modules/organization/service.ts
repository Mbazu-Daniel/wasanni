import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { invitation, member, organization } from "@wasanni/db/schema";
import { activeMember } from "@wasanni/db/schema";
import { OrganizationInvitationView, OrganizationSummary } from "@wasanni/contracts";

export function organizationService(db: Db) {
  return {
    async getForMember(userId: string): Promise<OrganizationSummary[]> {
      const rows = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          createdAt: organization.createdAt,
          role: member.role,
          memberId: member.id,
          displayName: member.displayName,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(and(eq(member.userId, userId), activeMember))
        .orderBy(desc(member.createdAt));

      return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
    },

    async getInvitationsForOrganization(
      organizationId: string,
    ): Promise<OrganizationInvitationView[]> {
      const rows = await db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })
        .from(invitation)
        .where(eq(invitation.organizationId, organizationId))
        .orderBy(desc(invitation.createdAt));

      return rows.map((row) => ({
        ...row,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }));
    },
  };
}

export type OrganizationService = ReturnType<typeof organizationService>;
