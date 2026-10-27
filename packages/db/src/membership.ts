import { and, eq } from "drizzle-orm";
import type { RoleName } from "@wasanni/contracts";
import type { Db } from "./client.ts";
import { activeMember, member } from "./schema/organization/member.ts";

export type MembershipRow = {
  memberId: string;
  role: RoleName;
  displayName: string | null;
};

export async function readMembership(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<MembershipRow | null> {
  const [row] = await db
    .select({
      memberId: member.id,
      role: member.role,
      displayName: member.displayName,
    })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId),
        activeMember,
      ),
    )
    .limit(1);

  return row ?? null;
}
