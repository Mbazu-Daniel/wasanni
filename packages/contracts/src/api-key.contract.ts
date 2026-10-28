import { t, type UnwrapSchema } from "elysia";

export const ApiKeyView = t.Object({
  id: t.String(),
  platformId: t.String(),
  name: t.String(),
  prefix: t.String(),
  enabled: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  expiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type ApiKeyView = UnwrapSchema<typeof ApiKeyView>;

export const ApiKeySingle = t.Object({ apiKey: ApiKeyView });
export type ApiKeySingle = UnwrapSchema<typeof ApiKeySingle>;

export const OrgApiKeyView = t.Object({
  ...ApiKeyView.properties,
  platformName: t.Union([t.String(), t.Null()]),
  platformSlug: t.Union([t.String(), t.Null()]),
});
export type OrgApiKeyView = UnwrapSchema<typeof OrgApiKeyView>;

export const OrgApiKeyList = t.Object({ keys: t.Array(OrgApiKeyView) });
export type OrgApiKeyList = UnwrapSchema<typeof OrgApiKeyList>;

export const ApiKeyList = t.Object({ keys: t.Array(ApiKeyView) });
export type ApiKeyList = UnwrapSchema<typeof ApiKeyList>;

export const CreatedApiKey = t.Object({
  id: t.String(),
  name: t.String(),
  prefix: t.String(),
  key: t.String(),
  expiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type CreatedApiKey = UnwrapSchema<typeof CreatedApiKey>;

export const CreatedApiKeySingle = t.Object({ apiKey: CreatedApiKey });
export type CreatedApiKeySingle = UnwrapSchema<typeof CreatedApiKeySingle>;

export const CreateApiKeyBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
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
  platformId: t.String(),
  keyId: t.String(),
});
export type ApiKeyIdParams = UnwrapSchema<typeof ApiKeyIdParams>;
