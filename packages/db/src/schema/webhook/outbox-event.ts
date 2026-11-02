import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { platform } from "../platform/platform.ts";

export const OUTBOX_STATUS_VALUES = ["pending", "published"] as const;

export type OutboxStatus = (typeof OUTBOX_STATUS_VALUES)[number];

export const outboxEvent = pgTable(
  "outbox_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    status: text("status", { enum: OUTBOX_STATUS_VALUES })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [index("outbox_event_pending_ix").on(t.status, t.createdAt)],
);
