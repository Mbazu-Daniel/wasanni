import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { AGENT_RUN_STATUSES } from "@wasanni/contracts";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";
import { agentProvider } from "./agent-provider.ts";
import { agentSession } from "./agent-session.ts";

export const agentRun = pgTable(
  "agent_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => agentSession.id, {
      onDelete: "set null",
    }),
    providerId: uuid("provider_id").references(() => agentProvider.id, {
      onDelete: "set null",
    }),
    createdByMemberId: uuid("created_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id"),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    output: text("output"),
    status: text("status", { enum: AGENT_RUN_STATUSES }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    costMicros: integer("cost_micros").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_run_organization_created_ix").on(
      t.organizationId,
      t.createdAt,
    ),
    index("agent_run_session_created_ix").on(t.sessionId, t.createdAt),
    index("agent_run_provider_ix").on(t.providerId),
  ],
);
