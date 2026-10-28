import { t, type UnwrapSchema } from "elysia";

export const AuthModel = {
  me: t.Object({
    user: t.Object({
      id: t.String(),
      email: t.String(),
      name: t.String(),
      emailVerified: t.Boolean(),
      image: t.Nullable(t.String()),
    }),
    session: t.Object({
      id: t.String(),
      expiresAt: t.String(),
    }),
  }),
} as const;

export type AuthModel = {
  [k in keyof typeof AuthModel]: UnwrapSchema<typeof AuthModel[k]>;
};
