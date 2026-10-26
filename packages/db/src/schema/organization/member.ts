import { isNull } from "drizzle-orm";
import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./organization.ts";
import { user } from "../identity/user.ts";

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    displayName: text("display_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("member_organization_user_ux")
      .on(t.organizationId, t.userId)
      .where(isNull(t.deletedAt)),
    index("member_organization_ix").on(t.organizationId),
    index("member_user_ix").on(t.userId),
  ],
);

export const activeMember = isNull(member.deletedAt);
