import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconBroadcast, IconDeviceGamepad2 } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlatformWebhooksPanel } from "@/components/platforms/webhooks-panel";
import { PlatformGamesPanel } from "@/components/platforms/games-panel";
import { PlatformKeysPanel } from "@/components/platforms/keys-panel";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "keys", label: "Keys" },
  { value: "webhooks", label: "Webhooks" },
  { value: "games", label: "Games" },
];

export const Route = createFileRoute("/$orgSlug/platforms/$platformSlug")({
  head: () => ({ meta: [{ title: "Platform · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      typeof search.tab === "string" && TABS.some((tab) => tab.value === search.tab)
        ? search.tab
        : "overview",
  }),
  component: PlatformDetailPage,
});

function PlatformDetailPage() {
  const { org } = Route.useRouteContext();
  const { platformSlug } = useParams({ from: "/$orgSlug/platforms/$platformSlug" });
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{
        platforms: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
        }[];
      }>(`/api/v1/organizations/${organizationId}/platforms`).then(
        (response) => response.platforms,
      ),
  });

  const platform = platforms.find((row) => row.slug === platformSlug) ?? null;

  if (org === null || isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  if (!platform) {
    return <div className="text-sm text-muted-foreground">Platform not found.</div>;
  }

  return (
    <div>
      <PageHeader
        title={
          <SearchableSelect
            value={platform.slug}
            onValueChange={(slug) => {
              if (slug !== platform.slug) {
                navigate({
                  to: "/$orgSlug/platforms/$platformSlug",
                  params: { orgSlug, platformSlug: slug },
                  search: { tab: "overview" },
                });
              }
            }}
            options={platforms.map((entry) => ({ value: entry.slug, label: entry.name }))}
            className="w-72"
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="font-mono">
              {platform.slug}
            </Badge>
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) => {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?tab=${next}`,
          );
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
        items={TABS}
      />

      <div className="pt-6">
        {tab === "overview" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <IconBroadcast className="size-4 text-blue" />
                <p className="text-sm font-semibold">What a platform is</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                A platform is where a game is played. Its API keys, webhooks and
                assigned games are configured here.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <IconDeviceGamepad2 className="size-4 text-pink" />
                <p className="text-sm font-semibold">Next</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Assign games to it, then add a webhook so the scores and
                sessions come back to you as events.
              </p>
            </div>
          </div>
        )}

        {tab === "keys" && (
          <PlatformKeysPanel
            organizationId={organizationId}
            platformId={platform.id}
          />
        )}

        {tab === "webhooks" && (
          <PlatformWebhooksPanel
            organizationId={organizationId}
            platformId={platform.id}
          />
        )}

        {tab === "games" && (
          <PlatformGamesPanel
            organizationId={organizationId}
            organizationSlug={orgSlug}
            platformId={platform.id}
          />
        )}
      </div>
    </div>
  );
}
