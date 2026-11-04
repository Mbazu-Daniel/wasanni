import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { ApiKeyCredential, Db } from "./types.ts";
import { apikey } from "./schema/api-key/apikey.ts";

export async function readActiveApiKey(
  db: Db,
  keyHash: string,
): Promise<ApiKeyCredential | null> {
  const [row] = await db
    .select({
      id: apikey.id,
      referenceId: apikey.referenceId,
      configId: apikey.configId,
      permissions: apikey.permissions,
      metadata: apikey.metadata,
    })
    .from(apikey)
    .where(
      and(
        eq(apikey.key, keyHash),
        eq(apikey.enabled, true),
        or(isNull(apikey.expiresAt), gt(apikey.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return row ?? null;
}
