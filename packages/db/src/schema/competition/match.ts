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
import { tournament } from "./tournament.ts";
import type { MatchStatus } from "@wasanni/contracts";

export const match = pgTable(
  "match",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id").references(() => tournament.id, {
      onDelete: "cascade",
    }),
    name: text("name"),
    bracketRound: integer("bracket_round"),
    bracketSlot: integer("bracket_slot"),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<MatchStatus>(),
    winnerParticipantId: uuid("winner_participant_id"),
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
    uniqueIndex("match_tournament_slot_ux").on(
      t.tournamentId,
      t.bracketRound,
      t.bracketSlot,
    ),
    index("match_organization_game_ix").on(t.organizationId, t.gameId),
    index("match_tournament_ix").on(t.tournamentId),
  ],
);
