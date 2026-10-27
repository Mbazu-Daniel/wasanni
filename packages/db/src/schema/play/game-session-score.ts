import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { platform } from "../platform/platform.ts";
import { game } from "../game/game.ts";
import { gameSession } from "./game-session.ts";
import type { ScoreFlag, ScoreSource, ScoreStatus } from "@wasanni/contracts";

export const gameSessionScore = pgTable(
  "game_session_score",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSession.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    mode: text("mode"),
    score: bigint("score", { mode: "number" }).notNull(),
    status: text("status").notNull().default("accepted").$type<ScoreStatus>(),
    flagged: boolean("flagged").notNull().default(false),
    flags: jsonb("flags").$type<ScoreFlag[]>().notNull().default([]),
    source: text("source").notNull().$type<ScoreSource>(),
    archiveKey: text("archive_key"),
    archiveOffset: bigint("archive_offset", { mode: "number" }),
    archiveLength: bigint("archive_length", { mode: "number" }),
    archiveRows: integer("archive_rows"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("game_session_score_session_ux").on(t.sessionId),
    index("game_session_score_game_platform_score_ix").on(t.gameId, t.platformId, t.score),
    index("game_session_score_organization_ix").on(t.organizationId),
  ],
);
