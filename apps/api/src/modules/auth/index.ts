import { Elysia } from "elysia";
import { ErrorBodyModel, toErrorBody } from "@wasanni/contracts";
import { internal } from "@wasanni/kit";
import { requestContextOf } from "../../plugins/request-context.ts";
import { createAuth } from "./auth.ts";
import { AuthModel } from "./model.ts";
import { authApiDocument, type AuthApiDocument } from "./openapi.ts";
import { AUTH_ROUTE_PREFIX } from "./constants.ts";
import type { ModuleDeps } from "../../types.ts";
import type { Auth } from "./auth.ts";

const buildPlugin = (auth: Auth) =>
  new Elysia({ name: "auth" })
    .all(`${AUTH_ROUTE_PREFIX}/*`, ({ request }) => auth.handler(request))
    .macro({
      auth: {
        async resolve({ request, status }) {
          const { requestId } = requestContextOf(request);
          const session = await auth.api.getSession({ headers: request.headers });

          if (session === null) {
            return status(
              401,
              toErrorBody(
                { code: "unauthenticated", message: "unauthenticated" },
                requestId,
              ),
            );
          }

          return { user: session.user, session: session.session };
        },
      },
    })
    .get(`${AUTH_ROUTE_PREFIX}/me`, ({ user, session }) => ({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
      },
      session: { id: session.id, expiresAt: session.expiresAt.toISOString() },
    }), {
      auth: true,
      detail: { tags: ["auth"], summary: "The authenticated user" },
      response: { 200: AuthModel.me, 401: ErrorBodyModel },
    });

export type AuthModule = {
  plugin: ReturnType<typeof buildPlugin>;
  apiDocument: () => Promise<AuthApiDocument>;
};

export const authModule = (deps: ModuleDeps): AuthModule => {
  if (deps.env.NODE_ENV === "production" && deps.sendEmail === undefined) {
    throw internal("auth refuses to boot in production without an email transport");
  }

  const auth = createAuth(deps);

  return { plugin: buildPlugin(auth), apiDocument: () => authApiDocument(auth) };
};
