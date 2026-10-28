import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { template } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  badRequest,
  buildObjectKey,
  type ObjectStorage,
  type StorageLimits,
} from "@wasanni/kit";
import type { TemplateUpload, TemplateView } from "@wasanni/contracts";
import { TEMPLATE_CONTENT_TYPES } from "./constants.ts";
import { readTemplateRow, toTemplateView } from "./template.service.ts";
import type { TemplateUploadInput } from "./types.ts";

export function createTemplateBundleService(
  db: Db,
  storage: ObjectStorage,
  config: StorageLimits,
) {
  const markFailed = async (scope: Scope, templateId: string): Promise<void> => {
    const row = await readTemplateRow(db, scope, templateId);

    if (row.pendingObjectKey !== null) {
      await storage.deleteObject(row.pendingObjectKey).catch(() => undefined);
    }

    await db
      .update(template)
      .set({
        status: "failed",
        pendingObjectKey: null,
        pendingSizeBytes: null,
        pendingContentType: null,
        pendingExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(scopeTo(scope, template, eq(template.id, row.id)));
  };

  return {
    async createUpload(scope: Scope, input: TemplateUploadInput): Promise<TemplateUpload> {
      const row = await readTemplateRow(db, scope, input.templateId);

      if (
        !TEMPLATE_CONTENT_TYPES.includes(
          input.body.contentType as (typeof TEMPLATE_CONTENT_TYPES)[number],
        )
      ) {
        throw badRequest("unsupported template content type");
      }

      if (input.body.sizeBytes < 1 || input.body.sizeBytes > config.maxBundleBytes) {
        throw badRequest("the template bundle is outside the size this api accepts");
      }

      const upload = await storage.createUploadTarget({
        key: buildObjectKey({
          location: "template-bundles",
          organizationId: scope.organizationId,
          segments: [row.id],
          filename: input.body.filename,
        }),
        contentType: input.body.contentType,
        sizeBytes: input.body.sizeBytes,
        expiresInSeconds: config.uploadUrlTtlSeconds,
      });

      const [updated] = await db
        .update(template)
        .set({
          status: "pending_upload",
          pendingObjectKey: upload.key,
          pendingSizeBytes: input.body.sizeBytes,
          pendingContentType: input.body.contentType,
          pendingExpiresAt: new Date(upload.expiresAt),
          updatedAt: new Date(),
        })
        .where(scopeTo(scope, template, eq(template.id, row.id)))
        .returning();

      if (updated === undefined) throw badRequest("template not found");

      return { template: toTemplateView(updated), upload };
    },

    async completeUpload(scope: Scope, templateId: string): Promise<TemplateView> {
      const row = await readTemplateRow(db, scope, templateId);

      if (row.pendingObjectKey === null) throw badRequest("there is no upload to confirm");

      if (row.pendingExpiresAt !== null && row.pendingExpiresAt.getTime() < Date.now()) {
        await markFailed(scope, templateId);
        throw badRequest("the upload url has expired");
      }

      const object = await storage.headObject(row.pendingObjectKey);
      if (object === null) throw badRequest("the uploaded object was not found");

      if (object.sizeBytes !== row.pendingSizeBytes) {
        await markFailed(scope, templateId);
        throw badRequest("the uploaded object does not have the declared size");
      }

      if (object.contentType !== row.pendingContentType) {
        await markFailed(scope, templateId);
        throw badRequest("the uploaded object does not have the declared content type");
      }

      const previousKey = row.objectKey;

      const [updated] = await db
        .update(template)
        .set({
          objectKey: row.pendingObjectKey,
          sizeBytes: row.pendingSizeBytes,
          contentType: row.pendingContentType,
          status: "ready",
          pendingObjectKey: null,
          pendingSizeBytes: null,
          pendingContentType: null,
          pendingExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(scopeTo(scope, template, eq(template.id, row.id)))
        .returning();

      if (updated === undefined) throw badRequest("template not found");

      if (previousKey !== null && previousKey !== row.pendingObjectKey) {
        await storage.deleteObject(previousKey).catch(() => undefined);
      }

      return toTemplateView(updated);
    },

    async createDownloadUrl(scope: Scope, templateId: string): Promise<string> {
      const row = await readTemplateRow(db, scope, templateId);

      if (row.status !== "ready" || row.objectKey === null) {
        throw badRequest("the template has no bundle to download");
      }

      return storage.createDownloadUrl({
        key: row.objectKey,
        expiresInSeconds: config.downloadUrlTtlSeconds,
      });
    },
  };
}
