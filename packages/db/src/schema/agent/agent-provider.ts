import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AgentProviderSpecId } from "@wasanni/contracts";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";

export const agentProvider = pgTable(
  "agent_provider",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    spec: text("spec").notNull().$type<AgentProviderSpecId>(),
    baseUrl: text("base_url").notNull(),
    model: text("model").notNull(),
    apiKeyCiphertext: text("api_key_ciphertext"),
    maxRequestTokens: integer("max_request_tokens"),
    isDefault: boolean("is_default").notNull().default(false),
    createdByMemberId: uuid("created_by_member_id").references(
      () => member.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("agent_provider_organization_name_ux").on(
      t.organizationId,
      t.name,
    ),
    index("agent_provider_organization_ix").on(t.organizationId),
  ],
);
