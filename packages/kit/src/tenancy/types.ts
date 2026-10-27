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

export type PlatformPrincipal = BasePrincipal & {
  kind: "platform";
  platformId: string;
  apiKeyId: string;
};

export type Principal = UserPrincipal | PlatformPrincipal;
