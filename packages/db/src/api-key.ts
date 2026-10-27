import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Db } from "./client.ts";
import { apiKey } from "./schema/api-key/api-key.ts";

export type ApiKeyCredential = {
  id: string;
  organizationId: string;
  platformId: string;
  permissions: string | null;
};

export async function readActiveApiKey(
  db: Db,
  keyHash: string,
): Promise<ApiKeyCredential | null> {
  const [row] = await db
    .select({
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      platformId: apiKey.platformId,
      permissions: apiKey.permissions,
    })
    .from(apiKey)
    .where(
      and(
        eq(apiKey.keyHash, keyHash),
        eq(apiKey.enabled, true),
        or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return row ?? null;
}
