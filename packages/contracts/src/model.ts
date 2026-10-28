import { t, type UnwrapSchema } from "elysia";

export const ErrorBodyModel = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Unknown()),
    requestId: t.String(),
  }),
});

export const HealthModel = t.Object({
  status: t.Literal("ok"),
  version: t.String(),
  uptimeSeconds: t.Number(),
});

export const ReadyModel = t.Object({
  status: t.Union([t.Literal("ready"), t.Literal("degraded")]),
  checks: t.Object({
    database: t.Boolean(),
    redis: t.Boolean(),
  }),
});

export type ErrorBodyModel = UnwrapSchema<typeof ErrorBodyModel>;

export type HealthModel = UnwrapSchema<typeof HealthModel>;

export type ReadyModel = UnwrapSchema<typeof ReadyModel>;
