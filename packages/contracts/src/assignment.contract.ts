import { t, type UnwrapSchema } from "elysia";

export const AssignmentStatus = t.Union([t.Literal("active"), t.Literal("disabled")]);
export type AssignmentStatus = UnwrapSchema<typeof AssignmentStatus>;

export const AssignmentView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  gameId: t.String(),
  platformId: t.String(),
  status: AssignmentStatus,
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type AssignmentView = UnwrapSchema<typeof AssignmentView>;

export const AssignmentSingle = t.Object({ assignment: AssignmentView });
export type AssignmentSingle = UnwrapSchema<typeof AssignmentSingle>;

export const OrgAssignmentView = t.Object({
  ...AssignmentView.properties,
  gameName: t.String(),
  gameSlug: t.String(),
  gameHosting: t.String(),
  gameStatus: t.String(),
  platformName: t.String(),
  platformSlug: t.String(),
});
export type OrgAssignmentView = UnwrapSchema<typeof OrgAssignmentView>;

export const OrgAssignmentList = t.Object({ assignments: t.Array(OrgAssignmentView) });
export type OrgAssignmentList = UnwrapSchema<typeof OrgAssignmentList>;

export const AssignmentList = t.Object({ assignments: t.Array(AssignmentView) });
export type AssignmentList = UnwrapSchema<typeof AssignmentList>;

export const CreateAssignmentBody = t.Object({
  platformId: t.String({ minLength: 1 }),
});
export type CreateAssignmentBody = UnwrapSchema<typeof CreateAssignmentBody>;

export const AssignmentIdParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  assignmentId: t.String(),
});
export type AssignmentIdParams = UnwrapSchema<typeof AssignmentIdParams>;
