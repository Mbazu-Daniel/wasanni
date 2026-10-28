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

export function pickOrganization(
  organizations: Organization[],
  activeId: string | null | undefined,
  lastSlug: string | null,
): Organization | undefined {
  return (
    organizations.find((item) => item.id === activeId) ??
    organizations.find((item) => item.slug === lastSlug) ??
    organizations[0]
  );
}

export async function resumeLastOrganizationSlug(): Promise<string | null | undefined> {
  const session = await fetchSession();
  if (session === null) return undefined;

  const organizations = await fetchOrganizations();
  const target = pickOrganization(
    organizations,
    session.session.activeOrganizationId,
    localStorage.getItem("wasanni:last-org"),
  );

  if (target === undefined) return null;

  await authClient.organization.setActive({ organizationId: target.id });
  localStorage.setItem("wasanni:last-org", target.slug);
  return target.slug;
}

export async function requireSession() {
  const session = await fetchSession();

  if (session === null) {
    throw redirect({ to: "/sign-in", search: { returnTo: undefined } });
  }

  return session;
}
