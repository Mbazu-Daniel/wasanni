import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:9000";

const basePath = "/api/v1/auth";

export const authClient = createAuthClient({
  baseURL,
  basePath,
  plugins: [organizationClient()],
});

export type Session = typeof authClient.$Infer.Session;
export type Organization = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
};
