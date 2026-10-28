import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const apiBaseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8088";

const basePath = "/api/v1/auth";

export const authClient = createAuthClient({
  baseURL: apiBaseURL,
  basePath,
  plugins: [organizationClient()],
});

export type Session = typeof authClient.$Infer.Session;
export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};
