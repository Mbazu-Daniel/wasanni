import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { platform } from "../platform/platform.ts";
import type { WebhookEvent } from "@wasanni/contracts";

export const webhookConfig = pgTable(
  "webhook_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    description: text("description"),
    secretCiphertext: text("secret_ciphertext").notNull(),
    secretLast4: text("secret_last4").notNull(),
    events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("webhook_config_platform_url_ux").on(t.platformId, t.url),
    index("webhook_config_platform_ix").on(t.platformId),
    index("webhook_config_organization_ix").on(t.organizationId),
  ],
);
