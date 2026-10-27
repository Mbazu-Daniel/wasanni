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
import { platform } from "../platform/platform.ts";
import { tournament } from "./tournament.ts";
import type { ParticipantStatus } from "@wasanni/contracts";

export const tournamentParticipant = pgTable(
  "tournament_participant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournament.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    displayName: text("display_name"),
    seed: integer("seed"),
    status: text("status")
      .notNull()
      .default("registered")
      .$type<ParticipantStatus>(),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("tournament_participant_identity_ux").on(
      t.tournamentId,
      t.platformId,
      t.externalUserId,
    ),
    index("tournament_participant_tournament_ix").on(t.tournamentId),
    index("tournament_participant_organization_ix").on(t.organizationId),
  ],
);
