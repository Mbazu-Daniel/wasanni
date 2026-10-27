import { t, type UnwrapSchema } from "elysia";

export const MemberView = t.Object({
  memberId: t.String(),
  userId: t.String(),
  email: t.String(),
  name: t.String(),
  avatar: t.Union([t.String(), t.Null()]),
  role: t.String(),
  displayName: t.Union([t.String(), t.Null()]),
  joinedAt: t.String({ format: "date-time" }),
});
export type MemberView = UnwrapSchema<typeof MemberView>;

export const MemberList = t.Object({ members: t.Array(MemberView) });
export type MemberList = UnwrapSchema<typeof MemberList>;

export const MemberSingle = t.Object({ member: MemberView });
export type MemberSingle = UnwrapSchema<typeof MemberSingle>;

export const UpdateMemberDisplayName = t.Object({
  displayName: t.String({ minLength: 1, maxLength: 80 }),
});
export type UpdateMemberDisplayName = UnwrapSchema<typeof UpdateMemberDisplayName>;

export const AvatarUploadTicket = t.Object({
  uploadUrl: t.String(),
  key: t.String(),
  expiresAt: t.String({ format: "date-time" }),
  maxBytes: t.Number(),
  allowedTypes: t.Array(t.String()),
});
export type AvatarUploadTicket = UnwrapSchema<typeof AvatarUploadTicket>;

export const AvatarUploadTicketSingle = t.Object({ upload: AvatarUploadTicket });
export type AvatarUploadTicketSingle = UnwrapSchema<typeof AvatarUploadTicketSingle>;

export const RequestAvatarUpload = t.Object({
  contentType: t.String({ minLength: 1, maxLength: 100 }),
});
export type RequestAvatarUpload = UnwrapSchema<typeof RequestAvatarUpload>;

export const SetMemberAvatar = t.Object({
  key: t.String({ minLength: 1, maxLength: 512 }),
});
export type SetMemberAvatar = UnwrapSchema<typeof SetMemberAvatar>;

export const SetMemberRole = t.Object({
  role: t.String({ minLength: 1, maxLength: 40 }),
});
export type SetMemberRole = UnwrapSchema<typeof SetMemberRole>;

export const MemberIdParams = t.Object({
  organizationId: t.String(),
  memberId: t.String(),
});
export type MemberIdParams = UnwrapSchema<typeof MemberIdParams>;
