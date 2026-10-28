import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconDeviceGamepad2,
  IconPlus,
  IconCloud,
  IconWorld,
  IconPlayerPlay,
  IconArchive,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";

export type GameRow = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  hosting: "hosted" | "external";
  status: "draft" | "active" | "archived";
  replayEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const Route = createFileRoute("/o/$orgSlug/games/")({
  head: () => ({ meta: [{ title: "Games · Wasanni" }] }),
  component: GamesPage,
});

function GamesPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameRow[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((r) => r.games),
    enabled: org !== null,
  });

  const newGameLink = (
    <Link to="/o/$orgSlug/games/new" params={{ orgSlug }}>
      <Button size="sm" className="gap-1.5">
        <IconPlus className="size-3.5" />
        New game
      </Button>
    </Link>
  );

  if (org === null) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  return (
    <div>
      <PageHeader
        title="Games"
        description="Everything your workspace ships. Hosted builds are served by Wasanni; external games call the API from your own servers."
        actions={newGameLink}
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState
          icon={<IconDeviceGamepad2 className="size-5" />}
          title="No games yet"
          description="Games are the nouns everything else hangs from. Add one to start receiving sessions and scores."
          primary={
            <Link to="/o/$orgSlug/games/new" params={{ orgSlug }}>
              <Button size="sm" className="gap-1.5">
                <IconPlus className="size-3.5" />
                Create game
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.id}
              to="/o/$orgSlug/games/$gameSlug"
              params={{ orgSlug, gameSlug: game.slug }}
              search={{ tab: "overview" }}
              className="group flex flex-col rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-pink/30 hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {game.hosting === "hosted" ? (
                    <IconCloud className="size-4 shrink-0 text-blue-soft" />
                  ) : (
                    <IconWorld className="size-4 shrink-0 text-cyan" />
                  )}
                  <h3 className="truncate text-sm font-semibold">{game.name}</h3>
                </div>
                <StatusPill status={game.status} />
              </div>

              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {game.slug}
              </p>

              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {game.description ?? "No description."}
              </p>

              <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  {game.hosting === "hosted" ? (
                    <>
                      <IconCloud className="size-3" /> hosted
                    </>
                  ) : (
                    <>
                      <IconWorld className="size-3" /> external
                    </>
                  )}
                </span>
                {game.replayEnabled && (
                  <span className="flex items-center gap-1">
                    <IconPlayerPlay className="size-3" /> replay
                  </span>
                )}
                {game.status === "archived" && (
                  <Badge variant="muted" className="ml-auto gap-1 text-[10px]">
                    <IconArchive className="size-2.5" />
                    archived
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
