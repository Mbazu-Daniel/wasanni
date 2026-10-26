import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, openAPI } from "better-auth/plugins";
import * as schema from "@wasanni/db/schema";
import { newId, sendDevEmail } from "@wasanni/kit";
import type { IdPrefix, SendEmail } from "@wasanni/kit";
import { AUTH_ROUTE_PREFIX } from "./constants.ts";
import type { ModuleDeps } from "../../types.ts";

const ID_PREFIX_BY_MODEL: Record<string, IdPrefix> = {
  user: "usr",
  session: "ses",
  account: "acc",
  verification: "ver",
};

function credentialsFor(
  clientId: string | undefined,
  clientSecret: string | undefined,
): { clientId: string; clientSecret: string } | null {
  if (clientId === undefined || clientSecret === undefined) return null;
  return { clientId, clientSecret };
}

export function createAuth(deps: ModuleDeps) {
  const { db, env } = deps;

  const sendMail: SendEmail = deps.sendEmail ?? ((payload) => sendDevEmail(payload, deps.logger));

  const sendSignInLink = (email: string, url: string): Promise<void> =>
    sendMail({ to: email, subject: "Your Wasanni sign-in link", url, purpose: "magic_link" });

  const sendConfirmationLink = (email: string, url: string): Promise<void> =>
    sendMail({ to: email, subject: "Confirm your Wasanni email", url, purpose: "verify" });

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
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => sendPasswordResetLink(user.email, url),
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => sendConfirmationLink(user.email, url),
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
        generateId: ({ model }) => {
          const prefix = ID_PREFIX_BY_MODEL[model];
          return prefix === undefined ? false : newId(prefix);
        },
        joins: true,
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => sendSignInLink(email, url),
      }),
      openAPI(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
