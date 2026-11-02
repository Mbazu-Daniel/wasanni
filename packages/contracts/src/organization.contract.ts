import { t, type UnwrapSchema } from "elysia";

export const OrganizationLogoUploadTicket = t.Object({
  uploadUrl: t.String(),
  key: t.String(),
  expiresAt: t.String({ format: "date-time" }),
  maxBytes: t.Number(),
  allowedTypes: t.Array(t.String()),
});
export type OrganizationLogoUploadTicket = UnwrapSchema<typeof OrganizationLogoUploadTicket>;

export const OrganizationLogoUploadTicketSingle = t.Object({
  upload: OrganizationLogoUploadTicket,
});
export type OrganizationLogoUploadTicketSingle = UnwrapSchema<
  typeof OrganizationLogoUploadTicketSingle
>;

export const RequestOrganizationLogoUpload = t.Object({
  contentType: t.String({ minLength: 1, maxLength: 100 }),
});
export type RequestOrganizationLogoUpload = UnwrapSchema<typeof RequestOrganizationLogoUpload>;

export const SetOrganizationLogo = t.Object({
  key: t.String({ minLength: 1, maxLength: 512 }),
});
export type SetOrganizationLogo = UnwrapSchema<typeof SetOrganizationLogo>;

export const OrganizationLogo = t.Object({
  logo: t.Union([t.String(), t.Null()]),
});
export type OrganizationLogo = UnwrapSchema<typeof OrganizationLogo>;
