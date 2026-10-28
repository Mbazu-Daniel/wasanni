import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { IconDeviceGamepad2, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignModal } from "@/components/assignments/assign-modal";

type Assignment = {
  id: string;
  gameId: string;
  status: string;
};

type Game = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export function PlatformGamesPanel({
  organizationId,
  organizationSlug,
  platformId,
}: {
  organizationId: string;
  organizationSlug: string;
  platformId: string;
}) {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = React.useState(false);

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments", organizationId, platformId],
    queryFn: () =>
      apiFetch<{ assignments: Assignment[] }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/games`,
      ).then((response) => response.assignments),
  });

  const { data: games = [], isLoading: loadingGames } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: Game[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) => response.games),
  });

  const byId = new Map(games.map((game) => [game.id, game]));
  const assignedIds = new Set(assignments.map((assignment) => assignment.gameId));
  const available = games.filter((game) => !assignedIds.has(game.id));

  const assign = async (gameId: string) => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments`,
        { method: "POST", data: JSON.stringify({ platformId }) },
      );
      toast.success("Game assigned to this platform");
      queryClient.invalidateQueries({
        queryKey: ["assignments", organizationId, platformId],
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
    games.length === 0 ? (
      <Link to="/$orgSlug/games/new" params={{ orgSlug: organizationSlug }}>
        <Button size="sm" className="gap-1.5">
          <IconPlus className="size-3.5" />
          Create a game
        </Button>
      </Link>
    ) : available.length === 0 ? (
      <span className="text-xs text-muted-foreground">Every game is assigned</span>
    ) : (
      <Button size="sm" className="gap-1.5" onClick={() => setAssignOpen(true)}>
        <IconPlus className="size-3.5" />
        Add game
      </Button>
    );

  if (loadingAssignments || loadingGames) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <p className="text-xs text-muted-foreground">
          The platform can only open sessions for the games below.
        </p>
        {action}
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<IconDeviceGamepad2 className="size-5" />}
          title="No games on this platform"
          description="Assign a game to this platform to let it open sessions and receive scores."
          primary={action}
        />
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => {
            const game = byId.get(assignment.gameId);

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {game?.name ?? assignment.gameId}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {game?.slug ?? assignment.gameId}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {game && (
                    <Link
                      to="/$orgSlug/games/$gameSlug"
                      params={{ orgSlug: organizationSlug, gameSlug: game.slug }}
                      search={{ tab: "assignments" }}
                    >
                      <Button variant="ghost" size="sm">
                        Configs
                      </Button>
                    </Link>
                  )}
                  <Badge variant={assignment.status === "active" ? "success" : "muted"}>
                    {assignment.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AssignModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign a game"
        description="The platform will be able to open sessions for the game you pick."
        label="Game"
        options={available.map((game) => ({
          id: game.id,
          name: game.name,
          slug: game.slug,
        }))}
        emptyHint="Every game is already assigned to this platform."
        onAssign={assign}
      />
    </div>
  );
}
