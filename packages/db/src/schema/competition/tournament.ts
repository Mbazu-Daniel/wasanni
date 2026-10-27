import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { game } from "../game/game.ts";
import { gamePlatformAssignment } from "../game/game-platform-assignment.ts";
import { gameConfig } from "../game/game-config.ts";
import { template } from "../template/template.ts";
import type { TournamentFormat, TournamentStatus } from "@wasanni/contracts";

export const tournament = pgTable(
  "tournament",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(
      () => gamePlatformAssignment.id,
      { onDelete: "set null" },
    ),
    gameConfigId: uuid("game_config_id").references(() => gameConfig.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id").references(() => template.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    format: text("format").notNull().$type<TournamentFormat>(),
    status: text("status")
      .notNull()
      .default("draft")
      .$type<TournamentStatus>(),
    maxParticipants: integer("max_participants"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tournament_organization_slug_ux").on(t.organizationId, t.slug),
    index("tournament_organization_ix").on(t.organizationId),
    index("tournament_status_ix").on(t.status),
  ],
);
