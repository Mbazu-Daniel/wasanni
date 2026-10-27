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

export type GameSessionPrincipal = {
  kind: "gameSession";
  sessionId: string;
  organizationId: string;
  platformId: string;
  gameId: string;
  externalUserId: string;
  mode: string | null;
};

export type Principal = UserPrincipal | PlatformPrincipal;
