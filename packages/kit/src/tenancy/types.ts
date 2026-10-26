type BasePrincipal = {
  organizationId: string;
  permissions: ReadonlySet<string>;
};

export type UserPrincipal = BasePrincipal & {
  kind: "user";
  userId: string;
  sessionId: string;
  memberId: string;
  role: string;
};

export type Principal = UserPrincipal;
