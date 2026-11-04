import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { apikey } from "@wasanni/db/schema";
import type { Scope } from "@wasanni/kit";
import { BadRequestError, NotFoundError } from "@wasanni/kit";
import {
  PLATFORM_KEY_PERMISSIONS,
  PLATFORM_ONLY_RESOURCES,
  listUnknownPermissions,
  type ApiKeyView,
  type CreatedApiKey,
  type CreateApiKeyBody,
} from "@wasanni/contracts";
import type { BetterAuth } from "../../config/types.ts";
import type { ApiKeyPatch } from "./types.ts";
import { encryptKeyMetadata, platformIdFromMetadata } from "./metadata.ts";

const scopeOf = (configId: string): ApiKeyView["scope"] =>
  configId === "platform" ? "platform" : "organization";

export function createApiKeyService(db: Db, auth: BetterAuth, encryptionKey: string) {
  const toView = (row: typeof apikey.$inferSelect): ApiKeyView => ({
    id: row.id,
    name: row.name ?? "",
    prefix: row.prefix ?? "",
    scope: scopeOf(row.configId),
    platformId: platformIdFromMetadata(row.metadata, encryptionKey),
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
  });

  return {
    async list(scope: Scope): Promise<ApiKeyView[]> {
      const rows = await db
        .select()
        .from(apikey)
        .where(eq(apikey.referenceId, scope.organizationId))
        .orderBy(desc(apikey.createdAt));

      return rows.map(toView);
    },

    async create(
      scope: Scope,
      actorUserId: string,
      input: CreateApiKeyBody,
    ): Promise<CreatedApiKey> {
      const unknown = listUnknownPermissions(input.permissions);
      if (unknown.length > 0) {
        throw new BadRequestError(`unknown permission: ${unknown.join(", ")}`);
      }

      const keyScope = input.scope ?? "organization";
      const platformId = input.platformId ?? null;

      if (keyScope === "platform" && platformId === null) {
        throw new BadRequestError("a platform api key needs a platformId");
      }
      if (keyScope === "organization" && platformId !== null) {
        throw new BadRequestError("an organization api key cannot name a platform");
      }

      if (keyScope === "organization") {
        const blocked = PLATFORM_ONLY_RESOURCES.filter(
          (resource) => (input.permissions[resource] ?? []).length > 0,
        );
        if (blocked.length > 0) {
          throw new BadRequestError(
            `an organization api key cannot grant ${blocked.join(", ")}: use a platform api key`,
          );
        }
      }

      if (keyScope === "platform") {
        const outside = Object.entries(input.permissions).flatMap(([resource, actions]) => {
          if (!Array.isArray(actions)) return [];
          const allowed = PLATFORM_KEY_PERMISSIONS[resource] ?? [];
          return actions
            .filter((action) => !allowed.includes(action))
            .map((action) => `${resource}:${action}`);
        });
        if (outside.length > 0) {
          throw new BadRequestError(
            `a platform api key cannot grant ${outside.join(", ")}: use an organization api key`,
          );
        }
      }

      const created = await auth.api.createApiKey({
        body: {
          configId: keyScope,
          name: input.name,
          organizationId: scope.organizationId,
          userId: actorUserId,
          permissions: input.permissions,
          ...(input.expiresInSeconds === undefined
            ? {}
            : { expiresIn: input.expiresInSeconds }),
          ...(platformId === null
            ? {}
            : { metadata: encryptKeyMetadata(platformId, encryptionKey) }),
        },
      });

      return {
        id: created.id,
        name: created.name ?? "",
        prefix: created.prefix ?? "",
        scope: scopeOf(created.configId),
        platformId,
        key: created.key,
        expiresAt: created.expiresAt === null ? null : created.expiresAt.toISOString(),
      };
    },

    async update(scope: Scope, keyId: string, patch: ApiKeyPatch): Promise<ApiKeyView> {
      const [row] = await db
        .update(apikey)
        .set({
          ...(patch.name === undefined ? {} : { name: patch.name }),
          ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
        })
        .where(and(eq(apikey.id, keyId), eq(apikey.referenceId, scope.organizationId)))
        .returning();

      if (row === undefined) throw new NotFoundError("api key not found");

      return toView(row);
    },

    async remove(scope: Scope, keyId: string): Promise<void> {
      const removed = await db
        .delete(apikey)
        .where(and(eq(apikey.id, keyId), eq(apikey.referenceId, scope.organizationId)))
        .returning({ id: apikey.id });

      if (removed.length === 0) throw new NotFoundError("api key not found");
    },
  };
}
