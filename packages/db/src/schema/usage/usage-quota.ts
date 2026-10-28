import {
  bigint,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { USAGE_METRICS, USAGE_PERIODS } from "@wasanni/contracts";
import { organization } from "../organization/organization.ts";

export const usageQuota = pgTable(
  "usage_quota",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    metric: text("metric", { enum: USAGE_METRICS }).notNull(),
    period: text("period", { enum: USAGE_PERIODS }).notNull().default("monthly"),
    limitValue: bigint("limit_value", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("usage_quota_org_metric_ux").on(t.organizationId, t.metric, t.period),
  ],
);
