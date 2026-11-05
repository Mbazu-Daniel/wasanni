import { pickOrganization } from "./session.ts";
import type { Organization } from "./auth-client.ts";

export type OnboardingEntry =
  | { kind: "stay" }
  | { kind: "redirect"; organizationId: string; orgSlug: string };

export function resolveOnboardingEntry(input: {
  organizations: Organization[];
  activeOrganizationId?: string | null;
  lastSlug?: string | null;
  fresh: boolean;
}): OnboardingEntry {
  if (input.fresh || input.organizations.length === 0) return { kind: "stay" };

  const target = pickOrganization(
    input.organizations,
    input.activeOrganizationId,
    input.lastSlug ?? null,
  );
  if (target === undefined) return { kind: "stay" };

  return { kind: "redirect", organizationId: target.id, orgSlug: target.slug };
}
