import { boolean, pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import type { GameHosting, GameStatus } from "@wasanni/contracts";

export const game = pgTable(
  "game",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    hosting: text("hosting").notNull().$type<GameHosting>(),
    status: text("status").notNull().default("draft").$type<GameStatus>(),
    replayEnabled: boolean("replay_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("game_organization_slug_ux").on(t.organizationId, t.slug),
    index("game_organization_ix").on(t.organizationId),
  ],
);
