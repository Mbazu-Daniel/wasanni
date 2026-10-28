import { jsonb, pgTable, text, timestamp, uuid, index, primaryKey } from "drizzle-orm/pg-core";
import type { RolePermission } from "@wasanni/contracts";
import { organization } from "./organization.ts";

export const organizationRole = pgTable(
  "organization_role",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permission: jsonb("permission").notNull().$type<RolePermission>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.role] }),
    index("organization_role_organization_ix").on(t.organizationId),
  ],
);
