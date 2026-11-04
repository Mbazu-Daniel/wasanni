import { eq } from "drizzle-orm";
import { NotFoundError, type ObjectStorage } from "@wasanni/kit";
import { organization } from "@wasanni/db/schema";
import type { Db } from "@wasanni/db";
import { assertImageKey, assertImageUploaded } from "../image/index.ts";

export const organizationLogoPrefix = (organizationId: string): string =>
  `${organizationId}/organizations/`;

export async function setOrganizationLogo(
  db: Db,
  storage: ObjectStorage,
  organizationId: string,
  key: string,
): Promise<string> {
  assertImageKey(key, organizationLogoPrefix(organizationId));
  await assertImageUploaded(storage, key);

  const logo = storage.publicUrl(key);

  const [row] = await db
    .update(organization)
    .set({ logo })
    .where(eq(organization.id, organizationId))
    .returning();

  if (row === undefined) throw new NotFoundError("organization not found");

  return logo;
}
