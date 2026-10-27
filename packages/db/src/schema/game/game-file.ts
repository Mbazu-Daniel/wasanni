import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";
import { game } from "./game.ts";
import type { GameFileStatus } from "@wasanni/contracts";

export const gameFile = pgTable(
  "game_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    objectKey: text("object_key").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    contentType: text("content_type").notNull(),
    etag: text("etag"),
    status: text("status").notNull().default("pending_upload").$type<GameFileStatus>(),
    isCurrent: boolean("is_current").notNull().default(false),
    uploadedByMemberId: uuid("uploaded_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    uploadExpiresAt: timestamp("upload_expires_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("game_file_object_key_ux").on(t.objectKey),
    index("game_file_game_ix").on(t.gameId),
    uniqueIndex("game_file_current_ux").on(t.gameId).where(sql`${t.isCurrent} = true`),
  ],
);
