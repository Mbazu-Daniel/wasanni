import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";

export const agentProject = pgTable(
  "agent_project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByMemberId: uuid("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("agent_project_organization_ix").on(t.organizationId)],
);
