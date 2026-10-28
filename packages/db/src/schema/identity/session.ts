import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./user.ts";

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    activeOrganizationId: text("active_organization_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("session_token_ux").on(t.token), index("session_user_ix").on(t.userId)],
);
