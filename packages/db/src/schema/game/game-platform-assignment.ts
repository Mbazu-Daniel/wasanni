import { pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "../organization/organization.ts";
import { member } from "../organization/member.ts";
import { platform } from "../platform/platform.ts";
import { game } from "./game.ts";
import type { AssignmentStatus } from "@wasanni/contracts";

export const gamePlatformAssignment = pgTable(
  "game_platform_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active").$type<AssignmentStatus>(),
    assignedByMemberId: uuid("assigned_by_member_id").references(() => member.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("game_platform_assignment_game_platform_ux").on(t.gameId, t.platformId),
    index("game_platform_assignment_organization_ix").on(t.organizationId),
    index("game_platform_assignment_platform_ix").on(t.platformId),
  ],
);
