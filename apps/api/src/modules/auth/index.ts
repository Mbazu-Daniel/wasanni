import type { BetterAuth } from "../../config/types.ts";
import { AUTH_ROUTE_PREFIX } from "../../constants.ts";
import type { PrincipalApi } from "../../plugins/types.ts";
import { ErrorBodyModel } from "@wasanni/contracts";
import { AuthModel } from "./model.ts";

export const createAuthRoutes = <T extends PrincipalApi>(
  api: T,
  auth: BetterAuth,
  providers: string[],
) =>
  api
    .all(`${AUTH_ROUTE_PREFIX}/*`, ({ request }) => auth.handler(request))
    .get(
      `${AUTH_ROUTE_PREFIX}/providers`,
      () => ({ providers }),
      {
        detail: { tags: ["auth"], summary: "The social providers this server can sign in with" },
        response: { 200: AuthModel.providers },
      },
    )
    .get(
      `${AUTH_ROUTE_PREFIX}/me`,
      ({ user, session }) => ({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          image: user.image ?? null,
        },
        session: { id: session.id, expiresAt: session.expiresAt.toISOString() },
      }),
      {
        auth: true,
        detail: { tags: ["auth"], summary: "The authenticated user" },
        response: { 200: AuthModel.me, 401: ErrorBodyModel },
      },
    );

export { buildAuthApiDocument } from "./openapi.ts";
