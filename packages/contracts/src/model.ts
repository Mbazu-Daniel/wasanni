import { t, type UnwrapSchema } from "elysia";

export const EnvelopeModel = {
  error: t.Object({
    error: t.Object({
      code: t.String(),
      message: t.String(),
      details: t.Optional(t.Unknown()),
      requestId: t.String(),
    }),
  }),

  health: t.Object({
    status: t.Literal("ok"),
    version: t.String(),
    uptimeSeconds: t.Number(),
  }),

  ready: t.Object({
    status: t.Union([t.Literal("ready"), t.Literal("degraded")]),
    checks: t.Object({
      database: t.Boolean(),
      redis: t.Boolean(),
    }),
  }),
} as const;

export type EnvelopeModel = {
  [k in keyof typeof EnvelopeModel]: UnwrapSchema<typeof EnvelopeModel[k]>;
};
