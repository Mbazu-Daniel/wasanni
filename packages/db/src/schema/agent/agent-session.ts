import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";
import { game } from "../game/game.ts";
import { agentProject } from "./agent-project.ts";

export const agentSession = pgTable(
  "agent_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByMemberId: uuid("created_by_member_id").references(
      () => member.id,
      { onDelete: "set null" },
    ),
    projectId: uuid("project_id").references(() => agentProject.id, {
      onDelete: "set null",
    }),
    gameId: uuid("game_id").references(() => game.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_session_organization_updated_ix").on(t.organizationId, t.updatedAt),
    index("agent_session_organization_pinned_ix").on(t.organizationId, t.pinned),
    index("agent_session_organization_creator_ix").on(t.organizationId, t.createdByMemberId),
    index("agent_session_game_ix").on(t.gameId),
  ],
);
