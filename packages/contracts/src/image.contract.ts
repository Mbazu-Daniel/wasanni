import { t, type UnwrapSchema } from "elysia";

export const ImageUploadTicket = t.Object({
  uploadUrl: t.String(),
  key: t.String(),
  expiresAt: t.String({ format: "date-time" }),
  maxBytes: t.Number(),
  allowedTypes: t.Array(t.String()),
});
export type ImageUploadTicket = UnwrapSchema<typeof ImageUploadTicket>;

export const ImageUploadTicketSingle = t.Object({
  upload: ImageUploadTicket,
});
export type ImageUploadTicketSingle = UnwrapSchema<
  typeof ImageUploadTicketSingle
>;

export const RequestImageUpload = t.Object({
  contentType: t.String({ minLength: 1, maxLength: 100 }),
});
export type RequestImageUpload = UnwrapSchema<typeof RequestImageUpload>;

export const SetImage = t.Object({
  key: t.String({ minLength: 1, maxLength: 512 }),
});
export type SetImage = UnwrapSchema<typeof SetImage>;
