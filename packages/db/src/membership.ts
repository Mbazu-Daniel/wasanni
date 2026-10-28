import { and, eq } from "drizzle-orm";
import type { Db, MembershipRow } from "./types.ts";
import { activeMember, member } from "./schema/organization/member.ts";

export async function readMembership(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<MembershipRow | null> {
  const [row] = await db
    .select({
      memberId: member.id,
      role: member.role,
      name: member.name,
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
