import { relations } from "drizzle-orm";
import { invitation } from "../organization/invitation.ts";
import { member } from "../organization/member.ts";
import { account } from "./account.ts";
import { session } from "./session.ts";
import { user } from "./user.ts";

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  members: many(member),
  invitations: many(invitation),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));
