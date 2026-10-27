import {
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
import { gameFile } from "../game/game-file.ts";
import { gameConfig } from "../game/game-config.ts";
import { gamePlatformAssignment } from "../game/game-platform-assignment.ts";
import { tournament } from "../competition/tournament.ts";
import { match } from "../competition/match.ts";
import type { GameSessionStatus } from "@wasanni/contracts";
import { SCORE_VERIFICATION_MODES } from "@wasanni/contracts";

export const gameSession = pgTable(
  "game_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => gamePlatformAssignment.id, { onDelete: "cascade" }),
    gameFileId: uuid("game_file_id").references(() => gameFile.id, {
      onDelete: "set null",
    }),
    gameConfigId: uuid("game_config_id").references(() => gameConfig.id, {
      onDelete: "set null",
    }),
    tournamentId: uuid("tournament_id").references(() => tournament.id, {
      onDelete: "set null",
    }),
    matchId: uuid("match_id").references(() => match.id, {
      onDelete: "set null",
    }),
    scoreVerificationMode: text("score_verification_mode", {
      enum: SCORE_VERIFICATION_MODES,
    })
      .notNull()
      .default("none"),
    scoreSigningKeyCiphertext: text("score_signing_key_ciphertext"),
    externalUserId: text("external_user_id").notNull(),
    externalUserName: text("external_user_name"),
    mode: text("mode"),
    status: text("status").notNull().default("active").$type<GameSessionStatus>(),
    tokenHash: text("token_hash"),
    configSnapshot: jsonb("config_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    configSchemaVersion: integer("config_schema_version").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("game_session_token_hash_ux").on(t.tokenHash),
    index("game_session_platform_user_ix").on(t.platformId, t.externalUserId),
    index("game_session_game_platform_ix").on(t.gameId, t.platformId),
    index("game_session_tournament_ix").on(t.tournamentId),
    index("game_session_organization_ix").on(t.organizationId),
  ],
);
