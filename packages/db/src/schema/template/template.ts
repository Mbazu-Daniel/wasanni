import {
  bigint,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import type { TemplateKind, TemplateStatus } from "@wasanni/contracts";

export const template = pgTable(
  "template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<TemplateKind>(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    objectKey: text("object_key"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    contentType: text("content_type"),
    status: text("status").notNull().default("pending_upload").$type<TemplateStatus>(),
    pendingObjectKey: text("pending_object_key"),
    pendingSizeBytes: bigint("pending_size_bytes", { mode: "number" }),
    pendingContentType: text("pending_content_type"),
    pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("template_organization_kind_slug_ux").on(
      t.organizationId,
      t.kind,
      t.slug,
    ),
    index("template_organization_ix").on(t.organizationId),
  ],
);
