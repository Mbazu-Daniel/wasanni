import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { template } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { conflict, internal, newId, notFound, type ObjectStorage } from "@wasanni/kit";
import type { TemplateKind, TemplateView } from "@wasanni/contracts";
import type {
  TemplateCreateInput,
  TemplateRow,
  TemplateUpdateInput,
} from "./types.ts";

export async function readTemplateRow(
  db: Db,
  scope: Scope,
  templateId: string,
): Promise<TemplateRow> {
  const [row] = await db
    .select()
    .from(template)
    .where(scopeTo(scope, template, eq(template.id, templateId)))
    .limit(1);

  if (row === undefined) throw notFound("template not found");
  return row;
}

export const toTemplateView = (row: TemplateRow): TemplateView => ({
  id: row.id,
  organizationId: row.organizationId,
  kind: row.kind,
  name: row.name,
  slug: row.slug,
  description: row.description,
  sizeBytes: row.sizeBytes,
  contentType: row.contentType,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export function createTemplateService(db: Db, storage: ObjectStorage) {
  return {
    async list(scope: Scope, kind?: TemplateKind): Promise<TemplateView[]> {
      const rows = await db
        .select()
        .from(template)
        .where(
          scopeTo(scope, template, kind === undefined ? undefined : eq(template.kind, kind)),
        )
        .orderBy(desc(template.createdAt));

      return rows.map(toTemplateView);
    },

    async get(scope: Scope, templateId: string): Promise<TemplateView> {
      return toTemplateView(await readTemplateRow(db, scope, templateId));
    },

    async create(scope: Scope, input: TemplateCreateInput): Promise<TemplateView> {
      try {
        const [row] = await db
          .insert(template)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            kind: input.body.kind,
            name: input.body.name,
            slug: input.body.slug,
            description: input.body.description ?? null,
            status: "pending_upload",
          })
          .returning();

        if (row === undefined) throw internal("template insert returned no row");
        return toTemplateView(row);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict("template slug already exists");
        throw error;
      }
    },

    async update(scope: Scope, input: TemplateUpdateInput): Promise<TemplateView> {
      try {
        const [row] = await db
          .update(template)
          .set({
            ...(input.body.name === undefined ? {} : { name: input.body.name }),
            ...(input.body.slug === undefined ? {} : { slug: input.body.slug }),
            ...(input.body.description === undefined
              ? {}
              : { description: input.body.description }),
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, template, eq(template.id, input.templateId)))
          .returning();

        if (row === undefined) throw notFound("template not found");
        return toTemplateView(row);
      } catch (error) {
        if (isUniqueViolation(error)) throw conflict("template slug already exists");
        throw error;
      }
    },

    async remove(scope: Scope, templateId: string): Promise<void> {
      const row = await readTemplateRow(db, scope, templateId);

      const removed = await db
        .delete(template)
        .where(scopeTo(scope, template, eq(template.id, row.id)))
        .returning({ id: template.id });

      if (removed.length === 0) throw notFound("template not found");

      const keys = [row.objectKey, row.pendingObjectKey].filter(
        (key): key is string => key !== null,
      );

      await Promise.allSettled(keys.map((key) => storage.deleteObject(key)));
    },
  };
}
