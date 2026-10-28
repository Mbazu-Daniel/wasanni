import { t, type UnwrapSchema } from "elysia";

export const GameSlug = t.String({
  minLength: 2,
  maxLength: 60,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});
export type GameSlug = UnwrapSchema<typeof GameSlug>;

export const GameHosting = t.Union([t.Literal("hosted"), t.Literal("external")]);
export type GameHosting = UnwrapSchema<typeof GameHosting>;

export const GameStatus = t.Union([
  t.Literal("draft"),
  t.Literal("active"),
  t.Literal("archived"),
]);
export type GameStatus = UnwrapSchema<typeof GameStatus>;

export const GameView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  hosting: GameHosting,
  status: GameStatus,
  replayEnabled: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type GameView = UnwrapSchema<typeof GameView>;

export const GameSingle = t.Object({ game: GameView });
export type GameSingle = UnwrapSchema<typeof GameSingle>;

export const GameList = t.Object({ games: t.Array(GameView) });
export type GameList = UnwrapSchema<typeof GameList>;

export const CreateGameBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  slug: GameSlug,
  description: t.Optional(t.String({ maxLength: 1000 })),
  hosting: GameHosting,
  replayEnabled: t.Optional(t.Boolean()),
});
export type CreateGameBody = UnwrapSchema<typeof CreateGameBody>;

export const UpdateGameBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    slug: t.Optional(GameSlug),
    description: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
    replayEnabled: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateGameBody = UnwrapSchema<typeof UpdateGameBody>;

export const ListGamesQuery = t.Object({
  hosting: t.Optional(GameHosting),
  status: t.Optional(GameStatus),
});
export type ListGamesQuery = UnwrapSchema<typeof ListGamesQuery>;

export const GameIdParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
});
export type GameIdParams = UnwrapSchema<typeof GameIdParams>;
