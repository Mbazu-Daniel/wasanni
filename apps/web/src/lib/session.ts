import { redirect } from "@tanstack/react-router";
import { authClient, type Organization } from "./auth-client";

export async function fetchSession() {
  const { data } = await authClient.getSession();
  return data ?? null;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await authClient.organization.list();

  return (data ?? []) as Organization[];
}

export async function requireSession() {
  const session = await fetchSession();

  if (session === null) {
    throw redirect({ to: "/sign-in", search: { returnTo: undefined } });
  }

  return session;
}
