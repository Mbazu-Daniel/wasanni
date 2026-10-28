import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconLink } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/primitives/status-pill";
import { GameOverviewPanel } from "@/components/games/overview-panel";
import { GameVersionsPanel } from "@/components/games/versions-panel";
import { GameSettingsPanel } from "@/components/games/settings-panel";
import { PlayButton } from "@/components/games/play-button";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "versions", label: "Versions" },
  { value: "assignments", label: "Assignments" },
  { value: "settings", label: "Settings" },
];

type GameRow = {
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

type AssignmentRow = {
  id: string;
  platformId: string;
  status: "active" | "disabled";
};

type PlatformRow = { id: string; name: string; slug: string };

export const Route = createFileRoute("/o/$orgSlug/games/$gameSlug/")({
  head: () => ({ meta: [{ title: "Game · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      typeof search.tab === "string" &&
      TABS.some((tab) => tab.value === search.tab)
        ? search.tab
        : "overview",
  }),
  component: GameDetailPage,
});

function GameDetailPage() {
  const { org } = Route.useRouteContext();
  const { gameSlug } = useParams({ from: "/o/$orgSlug/games/$gameSlug/" });
  const { tab } = Route.useSearch();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", organizationId, gameSlug],
    queryFn: async () => {
      const { games } = await apiFetch<{ games: GameRow[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      );
      return games.find((row) => row.slug === gameSlug) ?? null;
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["versions", organizationId, game?.id],
    queryFn: () =>
      apiFetch<{ files: { id: string; status: string; isCurrent: boolean }[] }>(
        `/api/v1/organizations/${organizationId}/games/${game!.id}/files`,
      ).then((r) => r.files),
    enabled: !!game,
  });

  if (org === null || isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  if (!game) {
    return <div className="text-sm text-muted-foreground">Game not found.</div>;
  }

  const currentFile = versions.find((v) => v.isCurrent && v.status === "ready");
  const activeTabs =
    game.hosting === "hosted"
      ? TABS
      : TABS.filter((t) => t.value !== "versions");

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/o/$orgSlug/games"
          params={{ orgSlug }}
          className="hover:text-foreground"
        >
          Games
        </Link>
        <span>/</span>
        <span className="text-foreground">{game.name}</span>
      </div>

      <PageHeader
        title={game.name}
        description={game.description ?? "No description."}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="font-mono">
              {game.slug}
            </Badge>
            <PlayButton
              gameId={game.id}
              fileId={currentFile?.id ?? null}
              hosting={game.hosting}
            />
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
        items={activeTabs}
      />

      <div className="pt-6">
        {tab === "overview" && (
          <GameOverviewPanel
            organizationId={organizationId}
            organizationSlug={orgSlug}
            game={game}
          />
        )}

        {tab === "versions" && game.hosting === "hosted" && (
          <GameVersionsPanel organizationId={organizationId} game={game} />
        )}

        {tab === "assignments" && (
          <GameAssignmentsTab
            organizationId={organizationId}
            orgSlug={orgSlug}
            gameSlug={game.slug}
          />
        )}

        {tab === "settings" && (
          <GameSettingsPanel
            organizationId={organizationId}
            organizationSlug={orgSlug}
            game={game}
          />
        )}
      </div>
    </div>
  );
}

function GameAssignmentsTab({
  organizationId,
  orgSlug,
  gameSlug,
}: {
  organizationId: string;
  orgSlug: string;
  gameSlug: string;
}) {
  const { data: game } = useQuery({
    queryKey: ["game", organizationId, gameSlug],
    queryFn: async () => {
      const { games } = await apiFetch<{ games: GameRow[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      );
      return games.find((row) => row.slug === gameSlug) ?? null;
    },
  });

  const gameId = game?.id;

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, gameId],
    queryFn: () =>
      apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments`,
      ).then((r) => r.assignments),
    enabled: !!gameId,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((r) => r.platforms),
  });

  const platformById = new Map(platforms.map((p) => [p.id, p]));

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={<IconLink className="size-5" />}
        title="Not assigned to any platform"
        description="Assign this game to a platform so its players can start sessions."
      />
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const platform = platformById.get(assignment.platformId);
        return (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {platform?.name ?? assignment.platformId}
              </span>
              {platform && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {platform.slug}
                </span>
              )}
              <StatusPill status={assignment.status} />
            </div>
            {platform && (
              <Link
                to="/o/$orgSlug/games/$gameSlug/assignments/$platformSlug"
                params={{ orgSlug, gameSlug, platformSlug: platform.slug }}
              >
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
