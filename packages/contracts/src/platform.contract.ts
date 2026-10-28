import { t, type UnwrapSchema } from "elysia";

export const PlatformSlug = t.String({
  minLength: 2,
  maxLength: 60,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});
export type PlatformSlug = UnwrapSchema<typeof PlatformSlug>;

export const PlatformView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type PlatformView = UnwrapSchema<typeof PlatformView>;

export const PlatformSingle = t.Object({ platform: PlatformView });
export type PlatformSingle = UnwrapSchema<typeof PlatformSingle>;

export const PlatformList = t.Object({ platforms: t.Array(PlatformView) });
export type PlatformList = UnwrapSchema<typeof PlatformList>;

export const CreatePlatformBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  slug: PlatformSlug,
  description: t.Optional(t.String({ maxLength: 500 })),
});
export type CreatePlatformBody = UnwrapSchema<typeof CreatePlatformBody>;

export const UpdatePlatformBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
    slug: t.Optional(PlatformSlug),
    description: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  },
  { minProperties: 1 },
);
export type UpdatePlatformBody = UnwrapSchema<typeof UpdatePlatformBody>;

export const OrganizationIdParams = t.Object({
  organizationId: t.String(),
});
export type OrganizationIdParams = UnwrapSchema<typeof OrganizationIdParams>;

export const PlatformIdParams = t.Object({
  organizationId: t.String(),
  platformId: t.String(),
});
export type PlatformIdParams = UnwrapSchema<typeof PlatformIdParams>;

export const CallerPlatformParams = t.Object({ platformId: t.String() });
export type CallerPlatformParams = UnwrapSchema<typeof CallerPlatformParams>;
