import { useQuery } from "@tanstack/react-query";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/primitives/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
  platformId,
}: {
  organizationId: string;
  platformId: string;
}) {
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

  if (loadingAssignments || loadingGames) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={<IconDeviceGamepad2 className="size-5" />}
        title="No games on this platform"
        description="Assign a game to this platform to let it open sessions and receive scores."
      />
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const game = byId.get(assignment.gameId);

        return (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {game?.name ?? assignment.gameId}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {game?.slug ?? assignment.gameId}
              </p>
            </div>
            <Badge variant={assignment.status === "active" ? "success" : "muted"}>
              {assignment.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
