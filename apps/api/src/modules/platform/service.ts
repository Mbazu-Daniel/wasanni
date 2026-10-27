import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { platform } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { conflict, newId, notFound } from "@wasanni/kit";

import type { PlatformView } from "@wasanni/contracts";

type PlatformRow = (typeof platform.$inferSelect);

type PlatformPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
};

const toView = (row: PlatformRow): PlatformView => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createPlatformService(db: Db) {
  const rethrowAsSlugConflict = (error: unknown): never => {
    if (isUniqueViolation(error)) throw conflict("platform slug already exists");
    throw error;
  };

  return {
    async list(scope: Scope): Promise<PlatformView[]> {
      const rows = await db
        .select()
        .from(platform)
        .where(scopeTo(scope, platform))
        .orderBy(desc(platform.createdAt));

      return rows.map(toView);
    },

    async get(scope: Scope, platformId: string): Promise<PlatformView> {
      const [row] = await db
        .select()
        .from(platform)
        .where(scopeTo(scope, platform, eq(platform.id, platformId)))
        .limit(1);

      if (row === undefined) throw notFound("platform not found");
      return toView(row);
    },

    async create(
      scope: Scope,
      input: { name: string; slug: string; description?: string },
    ): Promise<PlatformView> {
      try {
        const [row] = await db
          .insert(platform)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
          })
          .returning();

        if (row === undefined) throw new Error("platform insert returned no row");
        return toView(row);
      } catch (error) {
        return rethrowAsSlugConflict(error);
      }
    },

    async update(
      scope: Scope,
      platformId: string,
      patch: PlatformPatch,
    ): Promise<PlatformView> {
      try {
        const [row] = await db
          .update(platform)
          .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, platform, eq(platform.id, platformId)))
          .returning();

        if (row === undefined) throw notFound("platform not found");
        return toView(row);
      } catch (error) {
        return rethrowAsSlugConflict(error);
      }
    },

    async remove(scope: Scope, platformId: string): Promise<void> {
      const removed = await db
        .delete(platform)
        .where(scopeTo(scope, platform, eq(platform.id, platformId)))
        .returning({ id: platform.id });

      if (removed.length === 0) throw notFound("platform not found");
    },
  };
}

export type PlatformService = ReturnType<typeof createPlatformService>;
