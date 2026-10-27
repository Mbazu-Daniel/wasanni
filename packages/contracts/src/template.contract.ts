import { t, type UnwrapSchema } from "elysia";

export const TemplateKind = t.Union([t.Literal("game"), t.Literal("tournament")]);
export type TemplateKind = UnwrapSchema<typeof TemplateKind>;

export const TemplateStatus = t.Union([
  t.Literal("pending_upload"),
  t.Literal("ready"),
  t.Literal("failed"),
]);
export type TemplateStatus = UnwrapSchema<typeof TemplateStatus>;

export const TemplateSlug = t.String({
  minLength: 2,
  maxLength: 60,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});
export type TemplateSlug = UnwrapSchema<typeof TemplateSlug>;

export const TemplateView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  kind: TemplateKind,
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  sizeBytes: t.Union([t.Number(), t.Null()]),
  contentType: t.Union([t.String(), t.Null()]),
  status: TemplateStatus,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type TemplateView = UnwrapSchema<typeof TemplateView>;

export const TemplateSingle = t.Object({ template: TemplateView });
export type TemplateSingle = UnwrapSchema<typeof TemplateSingle>;

export const TemplateList = t.Object({ templates: t.Array(TemplateView) });
export type TemplateList = UnwrapSchema<typeof TemplateList>;

export const CreateTemplateBody = t.Object({
  kind: TemplateKind,
  name: t.String({ minLength: 1, maxLength: 120 }),
  slug: TemplateSlug,
  description: t.Optional(t.String({ maxLength: 1000 })),
});
export type CreateTemplateBody = UnwrapSchema<typeof CreateTemplateBody>;

export const UpdateTemplateBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    slug: t.Optional(TemplateSlug),
    description: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
  },
  { minProperties: 1 },
);
export type UpdateTemplateBody = UnwrapSchema<typeof UpdateTemplateBody>;

export const UploadTemplateBody = t.Object({
  filename: t.String({ minLength: 1, maxLength: 200 }),
  contentType: t.String({ minLength: 1, maxLength: 120 }),
  sizeBytes: t.Number({ minimum: 1, maximum: 5_368_709_120 }),
});
export type UploadTemplateBody = UnwrapSchema<typeof UploadTemplateBody>;

export const TemplateUpload = t.Object({
  template: TemplateView,
  upload: t.Object({
    key: t.String(),
    url: t.String(),
    method: t.Literal("PUT"),
    headers: t.Record(t.String(), t.String()),
    sizeBytes: t.Number(),
    expiresAt: t.String({ format: "date-time" }),
  }),
});
export type TemplateUpload = UnwrapSchema<typeof TemplateUpload>;

export const TemplateIdParams = t.Object({
  organizationId: t.String(),
  templateId: t.String(),
});
export type TemplateIdParams = UnwrapSchema<typeof TemplateIdParams>;

export const TemplateQuery = t.Object({
  kind: t.Optional(TemplateKind),
});
export type TemplateQuery = UnwrapSchema<typeof TemplateQuery>;
