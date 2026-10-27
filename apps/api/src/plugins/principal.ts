import { Elysia } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";
import type { Db } from "@wasanni/db";
import { readActiveApiKey, readMembership, type MembershipRow } from "@wasanni/db";
import { flattenPermissions, parsePermissionGrant, toErrorBody } from "@wasanni/contracts";
import { hashApiKey, requirePermission } from "@wasanni/kit";
import type { PlatformPrincipal, UserPrincipal } from "@wasanni/kit";
import { requestContextOf } from "./request-context.ts";
import { permissionsForRole } from "../permissions.ts";
import type { BetterAuth } from "../config/better-auth.ts";

export type PrincipalDeps = {
  db: Db;
  auth: BetterAuth;
};

type Session = NonNullable<Awaited<ReturnType<BetterAuth["api"]["getSession"]>>>;

type ErrorBody = ReturnType<typeof toErrorBody>;

type ElysiaStatus =
  | ElysiaCustomStatusResponse<401, ErrorBody, 401>
  | ElysiaCustomStatusResponse<403, ErrorBody, 403>;

type AuthResult = { user: Session["user"]; session: Session["session"] };

type OrganizationAuthResult = { principal: UserPrincipal };

type PlatformAuthResult = { principal: PlatformPrincipal };

const principalFor = async (
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

export const principal = ({ db, auth }: PrincipalDeps) =>
  new Elysia({ name: "principal" })
    .macro({
      auth: {
        async resolve({ request, status }): Promise<AuthResult | ElysiaStatus> {
          const { requestId } = requestContextOf(request);
          const session = await auth.api.getSession({ headers: request.headers });

          if (session === null) {
            return status(
              401,
              toErrorBody({ code: "unauthenticated", message: "unauthenticated" }, requestId),
            );
          }

          return { user: session.user, session: session.session };
        },
      },

      organizationAuth: (required: string | null) => ({
        async resolve({ params, request, status }): Promise<OrganizationAuthResult | ElysiaStatus> {
          const { requestId } = requestContextOf(request);

          const organizationId = (params as { organizationId?: string }).organizationId;
          if (!organizationId) {
            throw new Error("organizationAuth route is missing an :organizationId param");
          }

          const session = await auth.api.getSession({ headers: request.headers });
          if (session === null) {
            return status(
              401,
              toErrorBody({ code: "unauthenticated", message: "unauthenticated" }, requestId),
            );
          }

          const resolved = await principalFor(db, organizationId, session);
          if (resolved === null) {
            return status(
              403,
              toErrorBody({ code: "forbidden", message: "not an organization member" }, requestId),
            );
          }

          if (required !== null) requirePermission(resolved, required);

          return { principal: resolved };
        },
      }),

      platformAuth: (required: string | null) => ({
        async resolve({ request, status }): Promise<PlatformAuthResult | ElysiaStatus> {
          const { requestId } = requestContextOf(request);

          const secret = request.headers.get("x-api-key");
          if (secret === null || secret === "") {
            return status(
              401,
              toErrorBody(
                { code: "unauthenticated", message: "an api key is required" },
                requestId,
              ),
            );
          }

          const credential = await readActiveApiKey(db, hashApiKey(secret));
          if (credential === null) {
            return status(
              401,
              toErrorBody(
                { code: "unauthenticated", message: "the api key is not valid" },
                requestId,
              ),
            );
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
    });

export type PrincipalApi = ReturnType<typeof principal>;
