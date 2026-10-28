import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./organization.ts";
import { user } from "../identity/user.ts";
import { INVITATION_STATUS } from "./constants.ts";

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status", { enum: INVITATION_STATUS }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invitation_organization_email_ux").on(t.organizationId, t.email),
    index("invitation_organization_ix").on(t.organizationId),
  ],
);
