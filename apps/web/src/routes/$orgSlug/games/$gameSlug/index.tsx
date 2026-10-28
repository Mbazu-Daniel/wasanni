import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLink, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
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
import { AssignModal } from "@/components/assignments/assign-modal";

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
  createdAt: string;
  updatedAt: string;
};

type AssignmentRow = {
  id: string;
  platformId: string;
  status: "active" | "disabled";
};

type PlatformRow = { id: string; name: string; slug: string };

export const Route = createFileRoute("/$orgSlug/games/$gameSlug/")({
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
  const { gameSlug } = useParams({ from: "/$orgSlug/games/$gameSlug/" });
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
      <PageHeader
        title={game.name}
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
            game={game}
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
  game,
}: {
  organizationId: string;
  orgSlug: string;
  game: GameRow;
}) {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = React.useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, game.id],
    queryFn: () =>
      apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/games/${game.id}/assignments`,
      ).then((r) => r.assignments),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((r) => r.platforms),
  });

  const platformById = new Map(platforms.map((platform) => [platform.id, platform]));
  const assignedIds = new Set(assignments.map((assignment) => assignment.platformId));
  const available = platforms.filter((platform) => !assignedIds.has(platform.id));

  const assign = async (platformId: string) => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${game.id}/assignments`,
        { method: "POST", data: JSON.stringify({ platformId }) },
      );
      toast.success("Game assigned to platform");
      queryClient.invalidateQueries({
        queryKey: ["assignments", organizationId, game.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["assignments", organizationId, "all"],
      });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not assign the game",
      );
      return false;
    }
  };

  const action =
    platforms.length === 0 ? (
      <Link to="/$orgSlug/platforms/new" params={{ orgSlug }}>
        <Button size="sm" className="gap-1.5">
          <IconPlus className="size-3.5" />
          Create a platform
        </Button>
      </Link>
    ) : available.length === 0 ? (
      <span className="text-xs text-muted-foreground">On every platform</span>
    ) : (
      <Button size="sm" className="gap-1.5" onClick={() => setAssignOpen(true)}>
        <IconPlus className="size-3.5" />
        Add to platform
      </Button>
    );

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <p className="text-xs text-muted-foreground">
          A game only receives sessions from the platforms it is assigned to.
        </p>
        {action}
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<IconLink className="size-5" />}
          title="Not assigned to any platform"
          description="Assign this game to a platform so its players can start sessions."
          primary={action}
        />
      ) : (
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
                    to="/$orgSlug/games/$gameSlug/assignments/$platformSlug"
                    params={{ orgSlug, gameSlug: game.slug, platformSlug: platform.slug }}
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
      )}

      <AssignModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign to a platform"
        description="The platform will be able to open sessions for this game."
        label="Platform"
        options={available.map((platform) => ({
          id: platform.id,
          name: platform.name,
          slug: platform.slug,
        }))}
        emptyHint="Every platform already has this game."
        onAssign={assign}
      />
    </div>
  );
}
