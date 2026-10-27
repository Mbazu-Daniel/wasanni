import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { match } from "./match.ts";
import { platform } from "../platform/platform.ts";
import type { MatchOutcome } from "@wasanni/contracts";

export const matchParticipant = pgTable(
  "match_participant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => match.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    displayName: text("display_name"),
    seed: integer("seed"),
    sessionId: uuid("session_id"),
    score: bigint("score", { mode: "number" }),
    placement: integer("placement"),
    outcome: text("outcome")
      .notNull()
      .default("pending")
      .$type<MatchOutcome>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("match_participant_slot_ux").on(t.matchId, t.slot),
    uniqueIndex("match_participant_identity_ux").on(
      t.matchId,
      t.platformId,
      t.externalUserId,
    ),
    index("match_participant_session_ix").on(t.sessionId),
    index("match_participant_identity_ix").on(t.platformId, t.externalUserId),
  ],
);
