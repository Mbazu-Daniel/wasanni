import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconBroadcast,
  IconPlus,
  IconKey,
  IconWebhook,
  IconDeviceGamepad2,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type PlatformRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
};

export const Route = createFileRoute("/$orgSlug/platforms/")({
  head: () => ({ meta: [{ title: "Platforms · Wasanni" }] }),
  component: PlatformsPage,
});

function PlatformsPage() {
  const { org } = Route.useRouteContext();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
  });

  return (
    <div>
      <PageHeader
        title="Platforms"
        actions={
          <Link to="/$orgSlug/platforms/new" params={{ orgSlug: orgSlug }}>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="size-3.5" />
              New platform
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : platforms.length === 0 ? (
        <EmptyState
          icon={<IconBroadcast className="size-5" />}
          title="No platforms yet"
          description="A platform is where your games are used. Create one to issue API keys and start receiving sessions."
          primary={
            <Link to="/$orgSlug/platforms/new" params={{ orgSlug: orgSlug }}>
              <Button className="gap-1.5">
                <IconPlus className="size-3.5" />
                Create platform
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {platforms.map((platform) => (
            <Link
              key={platform.id}
              to="/$orgSlug/platforms/$platformSlug"
              params={{ orgSlug: orgSlug, platformSlug: platform.slug }}
              search={{ tab: "overview" }}
              className="group rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-pink/30 hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <IconBroadcast className="size-4 text-blue" />
                    <h3 className="truncate text-sm font-semibold">{platform.name}</h3>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {platform.slug}
                  </p>
                  {platform.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {platform.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <IconKey className="size-3.5" />
                  Keys
                </span>
                <span className="flex items-center gap-1.5">
                  <IconWebhook className="size-3.5" />
                  Webhooks
                </span>
                <span className="flex items-center gap-1.5">
                  <IconDeviceGamepad2 className="size-3.5" />
                  Games
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
