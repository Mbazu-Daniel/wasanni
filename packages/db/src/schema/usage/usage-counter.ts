import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { USAGE_METRICS } from "@wasanni/contracts";
import { organization } from "../organization/organization.ts";
import { platform } from "../platform/platform.ts";

export const usageCounter = pgTable(
  "usage_counter",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id").references(() => platform.id, {
      onDelete: "cascade",
    }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    metric: text("metric", { enum: USAGE_METRICS }).notNull(),
    value: bigint("value", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("usage_counter_ux")
      .on(t.organizationId, t.platformId, t.periodStart, t.metric)
      .nullsNotDistinct(),
    index("usage_counter_lookup_ix").on(t.organizationId, t.metric, t.periodStart),
    index("usage_counter_platform_ix").on(t.platformId),
  ],
);
