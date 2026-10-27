import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, organization } from "better-auth/plugins";
import * as schema from "@wasanni/db/schema";
import { readMembership } from "@wasanni/db";
import { internal, newId, sendDevEmail } from "@wasanni/kit";
import type { SendEmail } from "@wasanni/kit";
import { AUTH_ROUTE_PREFIX } from "../constants.ts";
import type { ModuleDeps } from "../types.ts";
import { ac, roles } from "../access.ts";

function credentialsFor(
  clientId: string | undefined,
  clientSecret: string | undefined,
): { clientId: string; clientSecret: string } | null {
  if (clientId === undefined || clientSecret === undefined) return null;
  return { clientId, clientSecret };
}

function resolveSender(deps: ModuleDeps): SendEmail {
  const enqueuer = deps.enqueuer;

  if (enqueuer === null || enqueuer === undefined) {
    return (payload) => sendDevEmail(payload, deps.logger);
  }

  if (deps.env.ZEPTOMAIL_API_KEY === undefined) {
    return (payload) => sendDevEmail(payload, deps.logger);
  }

  return async (payload) => {
    await enqueuer.email(payload);
  };
}

export function createBetterAuth(deps: ModuleDeps) {
  const { db, env } = deps;

  if (env.NODE_ENV === "production" && deps.sendEmail === undefined) {
    throw internal("better-auth refuses to boot in production without an email transport");
  }

  const sendMail: SendEmail = deps.sendEmail ?? resolveSender(deps);

  const sendPasswordResetLink = (email: string, url: string): Promise<void> =>
    sendMail({ to: email, subject: "Reset your Wasanni password", url, purpose: "reset" });

  const google = credentialsFor(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  const github = credentialsFor(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

  return betterAuth({
    appName: "Wasanni",
    basePath: AUTH_ROUTE_PREFIX,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.SESSION_SECRET,

    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => sendPasswordResetLink(user.email, url),
    },



    socialProviders: {
      ...(google ? { google } : {}),
      ...(github ? { github } : {}),
    },

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },

    advanced: {
      database: {
        generateId: () => newId(),
        joins: true,
      },
    },

    plugins: [
      {
        id: "default-name-from-email",
        hooks: {
          before: [
            {
              matcher: (ctx) => (ctx.path ?? "").endsWith("/sign-up/email"),
              handler: async (ctx) => {
                const body = ctx.body as { name?: string; email?: string } | undefined;
                if (!body?.name && body?.email) {
                  return {
                    context: {
                      body: { ...body, name: body.email.split("@")[0] },
                    },
                  };
                }
              },
            },
          ],
        },
      } satisfies BetterAuthPlugin,
      organization({
        ac,
        roles,
        requireEmailVerificationOnInvitation: false,
        invitationExpiresIn: 60 * 60 * 24 * 7,
        cancelPendingInvitationsOnReinvite: true,
        sendInvitationEmail: async ({ email, organization: invited, inviter, invitation }) => {
          const membership = await readMembership(db, invited.id, inviter.user.id);
          const inviterName = membership?.displayName ?? inviter.user.name;
          const url = `${env.PUBLIC_WEB_ORIGIN}/accept-invitation/${invitation.id}`;

          await sendMail({
            to: email,
            subject: `${inviterName} invited you to ${invited.name}`,
            url,
            purpose: "invitation",
          });
        },
        schema: {
          member: {
            additionalFields: {
              displayName: {
                type: "string",
                required: false,
                input: true,
              },
            },
          },
        },
      }),
      openAPI(),
    ],
  });
}

