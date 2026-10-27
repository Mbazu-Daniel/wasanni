import { Type, type Static } from "@sinclair/typebox";

export const OrganizationSummary = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  logo: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  role: Type.String(),
  memberId: Type.String(),
  displayName: Type.Union([Type.String(), Type.Null()]),
});

export type OrganizationSummary = Static<typeof OrganizationSummary>;

export const OrganizationMemberView = Type.Object({
  memberId: Type.String(),
  userId: Type.String(),
  email: Type.String(),
  name: Type.String(),
  image: Type.Union([Type.String(), Type.Null()]),
  role: Type.String(),
  displayName: Type.Union([Type.String(), Type.Null()]),
  joinedAt: Type.String({ format: "date-time" }),
});

export type OrganizationMemberView = Static<typeof OrganizationMemberView>;

export const OrganizationInvitationView = Type.Object({
  id: Type.String(),
  email: Type.String(),
  role: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  expiresAt: Type.String({ format: "date-time" }),
  createdAt: Type.String({ format: "date-time" }),
});

export type OrganizationInvitationView = Static<typeof OrganizationInvitationView>;

export const OrganizationSingle = Type.Object({ organization: OrganizationSummary });
export type OrganizationSingle = Static<typeof OrganizationSingle>;

export const OrganizationSummaryList = Type.Object({
  organizations: Type.Array(OrganizationSummary),
});
export type OrganizationSummaryList = Static<typeof OrganizationSummaryList>;

export const InvitationList = Type.Object({
  invitations: Type.Array(OrganizationInvitationView),
});
export type InvitationList = Static<typeof InvitationList>;

export const InviteMemberBody = Type.Object({
  email: Type.String({ format: "email" }),
  role: Type.Union([Type.Literal("admin"), Type.Literal("member")]),
});
export type InviteMemberBody = Static<typeof InviteMemberBody>;

export const UpdateMemberBody = Type.Object({
  role: Type.Optional(Type.Union([Type.Literal("admin"), Type.Literal("member")])),
  displayName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
});
export type UpdateMemberBody = Static<typeof UpdateMemberBody>;

export const SelfMemberBody = Type.Object({
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
});

export type SelfMemberBody = Static<typeof SelfMemberBody>;

export const MemberIdParams = Type.Object({
  organizationId: Type.String(),
  memberId: Type.String(),
});
export type MemberIdParams = Static<typeof MemberIdParams>;

export const InvitationIdParams = Type.Object({
  organizationId: Type.String(),
  invitationId: Type.String(),
});
export type InvitationIdParams = Static<typeof InvitationIdParams>;
