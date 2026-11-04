import { Elysia } from "elysia";
import type { Db } from "@wasanni/db";
import {
  readActiveApiKey,
  readGameSessionByToken,
  readMembership,
  readOrganizationRoles,
  type MembershipRow,
} from "@wasanni/db";
import { flattenPermissions, parsePermissionGrant } from "@wasanni/contracts";
import { defaultKeyHasher } from "@better-auth/api-key";
import { InternalServerError, sha256Hex, UnauthorizedError, ForbiddenError } from "@wasanni/kit";
import type { PlatformPrincipal, UserPrincipal } from "@wasanni/kit";
import type { Principal } from "@wasanni/kit";
import type { ApiKeyCredential } from "@wasanni/db";
import { platformIdFromMetadata } from "../modules/api-key/metadata.ts";
import { permissionsForRole, requirePermission } from "../permissions.ts";
import type {
  AuthResult,
  MemberAuthResult,
  OrganizationAuthResult,
  PlatformAuthResult,
  PrincipalDeps,
  Session,
  SessionAuthResult,
} from "./types.ts";

const resolvePrincipal = async (
  db: Db,
  organizationId: string,
  session: Session,
): Promise<UserPrincipal | null> => {
  const membership: MembershipRow | null = await readMembership(
    db,
    organizationId,
    session.user.id,
  );

  if (membership === null) return null;

  const grants = await readOrganizationRoles(db, organizationId);

  return {
    kind: "user",
    userId: session.user.id,
    sessionId: session.session.id,
    memberId: membership.memberId,
    organizationId,
    role: membership.role,
    permissions: permissionsForRole(membership.role, grants),
  };
};

const requestPrincipals = new WeakMap<Request, Principal>();

export const principalOf = (request: Request): Principal | undefined =>
  requestPrincipals.get(request);

export const storePrincipal = (request: Request, principal: Principal): void => {
  requestPrincipals.set(request, principal);
};

const keyPrincipalOf = (
  credential: ApiKeyCredential,
  encryptionKey: string,
): PlatformPrincipal => ({
  kind: "platform",
  apiKeyId: credential.id,
  organizationId: credential.referenceId,
  platformId: platformIdFromMetadata(credential.metadata, encryptionKey),
  permissions: flattenPermissions(parsePermissionGrant(credential.permissions)),
});

export const createPrincipalPlugin = ({ db, auth, encryptionKey }: PrincipalDeps) => {
  const organizationIdOf = (params: Record<string, unknown>, macro: string): string => {
    const organizationId = "organizationId" in params ? params.organizationId : null;

    if (typeof organizationId !== "string" || organizationId === "") {
      throw new InternalServerError(`${macro} route is missing an :organizationId param`);
    }

    return organizationId;
  };

  const sessionOf = (request: Request) => auth.api.getSession({ headers: request.headers });

  const memberPrincipalOf = async (
    organizationId: string,
    session: Session,
  ): Promise<UserPrincipal> => {
    const resolved = await resolvePrincipal(db, organizationId, session);

    if (resolved === null) throw new ForbiddenError("not an organization member");

    return resolved;
  };

  const apiKeyPrincipalOf = async (
    request: Request,
    missingMessage?: string,
  ): Promise<PlatformPrincipal> => {
    const secret = request.headers.get("x-api-key");

    if (secret === null || secret === "") throw new UnauthorizedError(missingMessage);

    const credential = await readActiveApiKey(db, await defaultKeyHasher(secret));

    if (credential === null) throw new UnauthorizedError("the api key is not valid");

    return keyPrincipalOf(credential, encryptionKey);
  };

  const authorize = <P extends Principal>(
    request: Request,
    principal: P,
    required: string | null,
  ): { principal: P } => {
    if (required !== null) requirePermission(principal, required);

    storePrincipal(request, principal);

    return { principal };
  };

  return new Elysia({ name: "principal" })
    .macro({
      auth: {
        async resolve({ request }): Promise<AuthResult> {
          const session = await auth.api.getSession({ headers: request.headers });

          if (session === null) throw new UnauthorizedError();

          return { user: session.user, session: session.session };
        },
      },

      memberAuth: (required: string | null) => ({
        async resolve({ params, request }): Promise<MemberAuthResult> {
          const organizationId = organizationIdOf(params, "memberAuth");

          const session = await sessionOf(request);
          if (session === null) throw new UnauthorizedError();

          const principal = await memberPrincipalOf(organizationId, session);

          return authorize(request, principal, required);
        },
      }),

      organizationAuth: (required: string | null) => ({
        async resolve({ params, request }): Promise<OrganizationAuthResult> {
          const organizationId = organizationIdOf(params, "organizationAuth");

          const session = await sessionOf(request);

          if (session !== null) {
            const principal = await memberPrincipalOf(organizationId, session);

            return authorize(request, principal, required);
          }

          const principal = await apiKeyPrincipalOf(request);
          if (principal.organizationId !== organizationId) {
            throw new ForbiddenError("the api key belongs to another organization");
          }

          return authorize(request, principal, required);
        },
      }),

      platformAuth: (required: string | null) => ({
        async resolve({ request }): Promise<PlatformAuthResult> {
          const principal = await apiKeyPrincipalOf(request, "an api key is required");

          return authorize(request, principal, required);
        },
      }),

      sessionAuth: {
        async resolve({ request }): Promise<SessionAuthResult> {
          const header = request.headers.get("authorization");
          const token = header === null ? "" : header.replace(/^Bearer\s+/i, "").trim();

          if (token === "") throw new UnauthorizedError("a session token is required");

          const session = await readGameSessionByToken(db, sha256Hex(token));
          if (session === null) throw new UnauthorizedError("the session token is not valid");

          return {
            sessionPrincipal: {
              kind: "gameSession",
              sessionId: session.id,
              organizationId: session.organizationId,
              platformId: session.platformId,
              gameId: session.gameId,
              externalUserId: session.externalUserId,
              mode: session.mode,
            },
          };
        },
      },
    });
};
