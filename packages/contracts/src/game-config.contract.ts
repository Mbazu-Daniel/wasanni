import { t, type UnwrapSchema } from "elysia";

export const GameConfigView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  assignmentId: t.String(),
  name: t.String(),
  config: t.Record(t.String(), t.Unknown()),
  schemaVersion: t.Number(),
  revision: t.Number(),
  isDefault: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type GameConfigView = UnwrapSchema<typeof GameConfigView>;

export const GameConfigSingle = t.Object({ config: GameConfigView });
export type GameConfigSingle = UnwrapSchema<typeof GameConfigSingle>;

export const GameConfigList = t.Object({ configs: t.Array(GameConfigView) });
export type GameConfigList = UnwrapSchema<typeof GameConfigList>;

export const CreateGameConfigBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  config: t.Optional(t.Record(t.String(), t.Unknown())),
  schemaVersion: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  isDefault: t.Optional(t.Boolean()),
});
export type CreateGameConfigBody = UnwrapSchema<typeof CreateGameConfigBody>;

export const UpdateGameConfigBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    config: t.Optional(t.Record(t.String(), t.Unknown())),
    schemaVersion: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
    isDefault: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateGameConfigBody = UnwrapSchema<typeof UpdateGameConfigBody>;

export const AssignmentParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
});
export type AssignmentParams = UnwrapSchema<typeof AssignmentParams>;

export const GameConfigIdParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
  configId: t.String(),
});
export type GameConfigIdParams = UnwrapSchema<typeof GameConfigIdParams>;
