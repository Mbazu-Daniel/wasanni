import type { Db } from "@wasanni/db";
import type {
  GameSessionPrincipal,
  PlatformPrincipal,
  UserPrincipal,
} from "@wasanni/kit";
import type { BetterAuth } from "../config/types.ts";
import type { createPrincipalPlugin } from "./principal.ts";

export type PrincipalDeps = {
  db: Db;
  auth: BetterAuth;
};

export type Session = NonNullable<Awaited<ReturnType<BetterAuth["api"]["getSession"]>>>;

export type AuthResult = { user: Session["user"]; session: Session["session"] };

export type OrganizationAuthResult = { principal: UserPrincipal };

export type PlatformAuthResult = { principal: PlatformPrincipal };

export type SessionAuthResult = { sessionPrincipal: GameSessionPrincipal };

export type PrincipalApi = ReturnType<typeof createPrincipalPlugin>;

export type RequestContext = {
  readonly requestId: string;
  readonly startedAt: number;
};
