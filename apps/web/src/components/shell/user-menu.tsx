import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  IconChevronUp,
  IconDeviceDesktop,
  IconLogout,
  IconMoon,
  IconPalette,
  IconSun,
  IconUser,
  IconSettings,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { fetchOrganizations, fetchSession } from "@/lib/session";
import { apiFetch } from "@/lib/api-client";
import type { MemberRow } from "@/lib/member-types";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useMenuDisclosure } from "./use-menu-disclosure";

const THEMES: ReadonlyArray<{ value: ThemePreference; label: string; icon: typeof IconSun }> = [
  { value: "light", label: "Light theme", icon: IconSun },
  { value: "dark", label: "Dark theme", icon: IconMoon },
  { value: "system", label: "Match system", icon: IconDeviceDesktop },
];

export function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preference, set: setTheme } = useTheme();
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
    staleTime: 30_000,
  });
  const organizationId = organizations.find((org) => org.slug === orgSlug)?.id;
  const { data: member } = useQuery({
    queryKey: ["member", organizationId],
    queryFn: () =>
      apiFetch<{ member: MemberRow }>(
        `/api/v1/organizations/${organizationId}/members/me`,
      ),
    enabled: organizationId !== undefined,
  });

  const user = session?.user;
  const memberData = member?.member;
  const displayName = memberData?.name ?? user?.name ?? user?.email ?? "Signed in";
  const displayImage = memberData?.avatar ?? user?.image;
  const initials = displayName.slice(0, 1).toUpperCase();

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    navigate({ to: "/sign-in", search: { returnTo: undefined } });
  }

  return (
    <details ref={useMenuDisclosure()} className="group/menu relative">
      <summary className="flex w-full cursor-pointer list-none items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-sidebar-accent [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-launch-ink/16 bg-launch-ink/[0.04] text-xs font-semibold text-launch-ink">
          {displayImage ? (
            <img src={displayImage} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium text-launch-ink">
            {displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user?.email}
          </span>
        </span>
        <IconChevronUp className="size-3.5 shrink-0 text-muted-foreground group-open:rotate-180 group-data-[collapsible=icon]:hidden" />
      </summary>

      <div className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[240px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-2xl">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          to="/$orgSlug/settings/account"
          params={{ orgSlug }}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink/[0.04]"
        >
          <IconUser className="size-3.5" />
          Account
        </Link>
        <Link
          to="/$orgSlug/settings/organization"
          params={{ orgSlug }}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink/[0.04]"
        >
          <IconSettings className="size-3.5" />
          Organization
        </Link>
        <div className="my-1 h-px bg-border" />
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <IconPalette className="size-3.5" />
            Theme
          </span>
          <span
            role="radiogroup"
            aria-label="Colour theme"
            className="flex items-center gap-0.5 rounded-md border border-border bg-ink/[0.04] p-0.5"
          >
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                role="radio"
                aria-checked={preference === theme.value}
                aria-label={theme.label}
                title={theme.label}
                onClick={() => setTheme(theme.value)}
                className={
                  preference === theme.value
                    ? "grid size-6 place-items-center rounded bg-primary text-primary-foreground"
                    : "grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <theme.icon className="size-3.5" />
              </button>
            ))}
          </span>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-pink hover:bg-pink/10"
        >
          <IconLogout className="size-3.5" />
          Sign out
        </button>
      </div>
    </details>
  );
}
