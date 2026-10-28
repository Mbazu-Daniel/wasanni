import { t, type UnwrapSchema } from "elysia";
import { BracketView } from "./match.contract.ts";

export const TournamentFormat = t.Union([
  t.Literal("leaderboard"),
  t.Literal("bracket"),
]);
export type TournamentFormat = UnwrapSchema<typeof TournamentFormat>;

export const TournamentStatus = t.Union([
  t.Literal("draft"),
  t.Literal("open"),
  t.Literal("running"),
  t.Literal("completed"),
  t.Literal("cancelled"),
]);
export type TournamentStatus = UnwrapSchema<typeof TournamentStatus>;

export const ParticipantStatus = t.Union([
  t.Literal("registered"),
  t.Literal("active"),
  t.Literal("withdrawn"),
  t.Literal("eliminated"),
  t.Literal("winner"),
]);
export type ParticipantStatus = UnwrapSchema<typeof ParticipantStatus>;

export const TournamentGame = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  hosting: t.String(),
});
export type TournamentGame = UnwrapSchema<typeof TournamentGame>;

export const TournamentPlatform = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
});
export type TournamentPlatform = UnwrapSchema<typeof TournamentPlatform>;

export const TournamentView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.Union([t.String(), t.Null()]),
  gameConfigId: t.Union([t.String(), t.Null()]),
  templateId: t.Union([t.String(), t.Null()]),
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  format: TournamentFormat,
  status: TournamentStatus,
  maxParticipants: t.Union([t.Number(), t.Null()]),
  startsAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  endsAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  startedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  completedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
  game: t.Optional(t.Union([TournamentGame, t.Null()])),
  platform: t.Optional(t.Union([TournamentPlatform, t.Null()])),
});
export type TournamentView = UnwrapSchema<typeof TournamentView>;

export const TournamentSingle = t.Object({ tournament: TournamentView });
export type TournamentSingle = UnwrapSchema<typeof TournamentSingle>;

export const TournamentList = t.Object({
  tournaments: t.Array(TournamentView),
});
export type TournamentList = UnwrapSchema<typeof TournamentList>;

export const TournamentIdParams = t.Object({
  organizationId: t.String(),
  tournamentId: t.String(),
});
export type TournamentIdParams = UnwrapSchema<typeof TournamentIdParams>;

export const TournamentQuery = t.Object({
  gameId: t.Optional(t.String()),
  status: t.Optional(TournamentStatus),
  format: t.Optional(TournamentFormat),
});
export type TournamentQuery = UnwrapSchema<typeof TournamentQuery>;

export const PlatformTournamentQuery = t.Object({
  gameId: t.Optional(t.String()),
});
export type PlatformTournamentQuery = UnwrapSchema<typeof PlatformTournamentQuery>;

export const CreateTournamentBody = t.Object({
  gameId: t.String(),
  assignmentId: t.Optional(t.String()),
  gameConfigId: t.Optional(t.String()),
  templateId: t.Optional(t.String()),
  name: t.String({ minLength: 1, maxLength: 120 }),
  slug: t.String({
    minLength: 2,
    maxLength: 60,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  }),
  description: t.Optional(t.String({ maxLength: 2000 })),
  format: TournamentFormat,
  maxParticipants: t.Optional(t.Number({ minimum: 2, maximum: 256 })),
  startsAt: t.Optional(t.String({ format: "date-time" })),
  endsAt: t.Optional(t.String({ format: "date-time" })),
});
export type CreateTournamentBody = UnwrapSchema<typeof CreateTournamentBody>;

export const UpdateTournamentBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  slug: t.Optional(
    t.String({
      minLength: 2,
      maxLength: 60,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    }),
  ),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  maxParticipants: t.Optional(
    t.Union([t.Number({ minimum: 2, maximum: 256 }), t.Null()]),
  ),
  startsAt: t.Optional(
    t.Union([t.String({ format: "date-time" }), t.Null()]),
  ),
  endsAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  gameConfigId: t.Optional(t.Union([t.String(), t.Null()])),
  templateId: t.Optional(t.Union([t.String(), t.Null()])),
});
export type UpdateTournamentBody = UnwrapSchema<typeof UpdateTournamentBody>;

export const ParticipantView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  tournamentId: t.String(),
  platformId: t.String(),
  externalUserId: t.String(),
  displayName: t.Union([t.String(), t.Null()]),
  seed: t.Union([t.Number(), t.Null()]),
  status: ParticipantStatus,
  registeredAt: t.String({ format: "date-time" }),
  withdrawnAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type ParticipantView = UnwrapSchema<typeof ParticipantView>;

export const ParticipantSingle = t.Object({ participant: ParticipantView });
export type ParticipantSingle = UnwrapSchema<typeof ParticipantSingle>;

export const ParticipantList = t.Object({
  participants: t.Array(ParticipantView),
});
export type ParticipantList = UnwrapSchema<typeof ParticipantList>;

export const ParticipantParams = t.Object({
  organizationId: t.String(),
  tournamentId: t.String(),
  participantId: t.String(),
});
export type ParticipantParams = UnwrapSchema<typeof ParticipantParams>;

export const RegisterParticipantBody = t.Object({
  platformId: t.String(),
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
  displayName: t.Optional(t.String({ maxLength: 200 })),
});
export type RegisterParticipantBody = UnwrapSchema<typeof RegisterParticipantBody>;

export const PlatformJoinParams = t.Object({
  tournamentId: t.String(),
  externalUserId: t.String({ minLength: 1, maxLength: 200 }),
});
export type PlatformJoinParams = UnwrapSchema<typeof PlatformJoinParams>;

export const PlatformJoinBody = t.Object({
  displayName: t.Optional(t.String({ maxLength: 200 })),
});
export type PlatformJoinBody = UnwrapSchema<typeof PlatformJoinBody>;

export const PlatformTournamentParams = t.Object({ tournamentId: t.String() });
export type PlatformTournamentParams = UnwrapSchema<
  typeof PlatformTournamentParams
>;

export const StandingsRow = t.Object({
  position: t.Number(),
  participantId: t.String(),
  externalUserId: t.String(),
  displayName: t.Union([t.String(), t.Null()]),
  seed: t.Union([t.Number(), t.Null()]),
  status: t.String(),
  score: t.Union([t.Number(), t.Null()]),
  flagged: t.Boolean(),
  flags: t.Array(t.String()),
  submittedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type StandingsRow = UnwrapSchema<typeof StandingsRow>;

export const TournamentLeaderboard = t.Object({ rows: t.Array(StandingsRow) });
export type TournamentLeaderboard = UnwrapSchema<typeof TournamentLeaderboard>;

export const Standings = t.Union([
  t.Object({
    format: t.Literal("leaderboard"),
    rows: t.Array(StandingsRow),
  }),
  t.Object({ format: t.Literal("bracket"), bracket: BracketView }),
]);
export type Standings = UnwrapSchema<typeof Standings>;
