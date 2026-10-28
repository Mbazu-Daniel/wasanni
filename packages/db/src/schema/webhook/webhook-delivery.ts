import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { platform } from "../platform/platform.ts";
import { webhookConfig } from "./webhook-config.ts";

export const WEBHOOK_DELIVERY_STATUS_VALUES = [
  "delivered",
  "failed",
  "retrying",
] as const;

export type WebhookDeliveryStatus =
  (typeof WEBHOOK_DELIVERY_STATUS_VALUES)[number];

export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => webhookConfig.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    attempt: integer("attempt").notNull(),
    status: text("status", { enum: WEBHOOK_DELIVERY_STATUS_VALUES }).notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("webhook_delivery_webhook_created_ix").on(t.webhookId, t.createdAt),
    index("webhook_delivery_event_ix").on(t.eventId),
  ],
);
