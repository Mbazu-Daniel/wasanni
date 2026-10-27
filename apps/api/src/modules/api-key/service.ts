import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { apiKey, platform } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { API_KEY_DISPLAY_CHARS, BadRequestError, hashApiKey, InternalServerError, newApiKeySecret, newId, NotFoundError } from "@wasanni/kit";
import {
  listUnknownPermissions,
  type ApiKeyView,
  type CreatedApiKey,
  type PermissionGrant,
} from "@wasanni/contracts";

import type { ApiKeyPatch, ApiKeyRow } from "./types.ts";

const toView = (row: ApiKeyRow): ApiKeyView => ({
  id: row.id,
  platformId: row.platformId,
  name: row.name,
  prefix: row.prefix,
  enabled: row.enabled,
  createdAt: row.createdAt.toISOString(),
  expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
});

export function createApiKeyService(db: Db) {
  return {
    async list(scope: Scope, platformId: string): Promise<ApiKeyView[]> {
      const rows = await db
        .select()
        .from(apiKey)
        .where(scopeTo(scope, apiKey, eq(apiKey.platformId, platformId)))
        .orderBy(desc(apiKey.createdAt));

      return rows.map(toView);
    },

    async create(
      scope: Scope,
      input: {
        platformId: string;
        name: string;
        expiresInSeconds?: number;
        permissions: PermissionGrant;
      },
    ): Promise<CreatedApiKey> {
      const unknown = listUnknownPermissions(input.permissions);
      if (unknown.length > 0) {
        throw new BadRequestError(`unknown permission: ${unknown.join(", ")}`);
      }

      const [owned] = await db
        .select({ id: platform.id })
        .from(platform)
        .where(scopeTo(scope, platform, eq(platform.id, input.platformId)))
        .limit(1);

      if (owned === undefined) throw new NotFoundError("platform not found");

      const secret = newApiKeySecret();
      const expiresAt =
        input.expiresInSeconds === undefined
          ? null
          : new Date(Date.now() + input.expiresInSeconds * 1000);

      const [row] = await db
        .insert(apiKey)
        .values({
          id: newId(),
          organizationId: scope.organizationId,
          platformId: input.platformId,
          name: input.name,
          prefix: secret.slice(0, API_KEY_DISPLAY_CHARS),
          keyHash: hashApiKey(secret),
          permissions: JSON.stringify(input.permissions),
          expiresAt,
        })
        .returning({
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          expiresAt: apiKey.expiresAt,
        });

      if (row === undefined) throw new InternalServerError("api key insert returned no row");

      return {
        id: row.id,
        name: row.name,
        prefix: row.prefix,
        key: secret,
        expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
      };
    },

    async update(
      scope: Scope,
      platformId: string,
      keyId: string,
      patch: ApiKeyPatch,
    ): Promise<ApiKeyView> {
      const [row] = await db
        .update(apiKey)
        .set({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        })
        .where(
          scopeTo(scope, apiKey, eq(apiKey.id, keyId), eq(apiKey.platformId, platformId)),
        )
        .returning();

      if (row === undefined) throw new NotFoundError("api key not found");
      return toView(row);
    },

    async remove(scope: Scope, platformId: string, keyId: string): Promise<void> {
      const removed = await db
        .delete(apiKey)
        .where(
          scopeTo(scope, apiKey, eq(apiKey.id, keyId), eq(apiKey.platformId, platformId)),
        )
        .returning({ id: apiKey.id });

      if (removed.length === 0) throw new NotFoundError("api key not found");
    },
  };
}
