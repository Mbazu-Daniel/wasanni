import {
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

export const joinCode = pgTable(
  "join_code",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSession.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("join_code_code_ux").on(t.codeHash),
    uniqueIndex("join_code_session_ux").on(t.sessionId),
    index("join_code_organization_ix").on(t.organizationId),
  ],
);
