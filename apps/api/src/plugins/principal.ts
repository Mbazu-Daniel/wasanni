import { Elysia } from "elysia";
import type { Db } from "@wasanni/db";
import {
  readActiveApiKey,
  readGameSessionByToken,
  readMembership,
  type MembershipRow,
} from "@wasanni/db";
import { flattenPermissions, parsePermissionGrant } from "@wasanni/contracts";
import { hashApiKey, InternalServerError, sha256Hex, UnauthorizedError, ForbiddenError } from "@wasanni/kit";
import type { PlatformPrincipal, UserPrincipal } from "@wasanni/kit";
import { permissionsForRole, requirePermission } from "../permissions.ts";
import type {
  AuthResult,
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

  return {
    kind: "user",
    userId: session.user.id,
    sessionId: session.session.id,
    memberId: membership.memberId,
    organizationId,
    role: membership.role,
    permissions: permissionsForRole(membership.role),
  };
};

export const createPrincipalPlugin = ({ db, auth }: PrincipalDeps) =>
  new Elysia({ name: "principal" })
    .macro({
      auth: {
        async resolve({ request }): Promise<AuthResult> {
          const session = await auth.api.getSession({ headers: request.headers });

          if (session === null) throw new UnauthorizedError();

          return { user: session.user, session: session.session };
        },
      },

      organizationAuth: (required: string | null) => ({
        async resolve({ params, request }): Promise<OrganizationAuthResult> {
          const organizationId = (params as { organizationId?: string }).organizationId;
          if (!organizationId) {
            throw new InternalServerError("organizationAuth route is missing an :organizationId param");
          }

          const session = await auth.api.getSession({ headers: request.headers });
          if (session === null) throw new UnauthorizedError();

          const resolved = await resolvePrincipal(db, organizationId, session);
          if (resolved === null) throw new ForbiddenError("not an organization member");

          if (required !== null) requirePermission(resolved, required);

          return { principal: resolved };
        },
      }),

      platformAuth: (required: string | null) => ({
        async resolve({ request }): Promise<PlatformAuthResult> {
          const secret = request.headers.get("x-api-key");
          if (secret === null || secret === "") {
            throw new UnauthorizedError("an api key is required");
          }

          const credential = await readActiveApiKey(db, hashApiKey(secret));
          if (credential === null) {
            throw new UnauthorizedError("the api key is not valid");
          }

          const principal: PlatformPrincipal = {
            kind: "platform",
            platformId: credential.platformId,
            apiKeyId: credential.id,
            organizationId: credential.organizationId,
            permissions: flattenPermissions(parsePermissionGrant(credential.permissions)),
          };

          if (required !== null) requirePermission(principal, required);

          return { principal };
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
