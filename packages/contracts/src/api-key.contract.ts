import { t, type UnwrapSchema } from "elysia";

export const ApiKeyScopeModel = t.Union([
  t.Literal("organization"),
  t.Literal("platform"),
]);
export type ApiKeyScope = UnwrapSchema<typeof ApiKeyScopeModel>;

export const ApiKeyView = t.Object({
  id: t.String(),
  name: t.String(),
  prefix: t.String(),
  scope: ApiKeyScopeModel,
  platformId: t.Union([t.String(), t.Null()]),
  enabled: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  expiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type ApiKeyView = UnwrapSchema<typeof ApiKeyView>;

export const ApiKeySingle = t.Object({ apiKey: ApiKeyView });
export type ApiKeySingle = UnwrapSchema<typeof ApiKeySingle>;

export const ApiKeyList = t.Object({ keys: t.Array(ApiKeyView) });
export type ApiKeyList = UnwrapSchema<typeof ApiKeyList>;

export const CreatedApiKey = t.Object({
  id: t.String(),
  name: t.String(),
  prefix: t.String(),
  scope: ApiKeyScopeModel,
  platformId: t.Union([t.String(), t.Null()]),
  key: t.String(),
  expiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type CreatedApiKey = UnwrapSchema<typeof CreatedApiKey>;

export const CreatedApiKeySingle = t.Object({ apiKey: CreatedApiKey });
export type CreatedApiKeySingle = UnwrapSchema<typeof CreatedApiKeySingle>;

export const CreateApiKeyBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  scope: t.Optional(ApiKeyScopeModel),
  platformId: t.Optional(t.String()),
  expiresInSeconds: t.Optional(t.Number({ minimum: 3600, maximum: 31536000 })),
  permissions: t.Record(t.String(), t.Array(t.String())),
});
export type CreateApiKeyBody = UnwrapSchema<typeof CreateApiKeyBody>;

export const UpdateApiKeyBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    enabled: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateApiKeyBody = UnwrapSchema<typeof UpdateApiKeyBody>;

export const ApiKeyIdParams = t.Object({
  organizationId: t.String(),
  keyId: t.String(),
});
export type ApiKeyIdParams = UnwrapSchema<typeof ApiKeyIdParams>;
