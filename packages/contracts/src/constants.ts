import { t } from "elysia";

export const ID_PREFIXES = [
  "usr", "acc", "ses", "ver",
  "wsp", "wsm", "rol", "prm", "rpm",
  "plt", "key",
  "gam", "gfl", "gpa", "cfg", "tpl",
  "trn", "tpt", "mch", "mtm", "mpt",
  "gsx", "scr",
  "whk", "aud",
] as const;

export const ErrorEnvelopeSchema = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Unknown()),
    requestId: t.String(),
  }),
});

export const HealthResponseSchema = t.Object({
  status: t.Literal("ok"),
  version: t.String(),
  uptimeSeconds: t.Number(),
});

export const ReadyResponseSchema = t.Object({
  status: t.Union([t.Literal("ready"), t.Literal("degraded")]),
  checks: t.Object({
    database: t.Boolean(),
    redis: t.Boolean(),
  }),
});
