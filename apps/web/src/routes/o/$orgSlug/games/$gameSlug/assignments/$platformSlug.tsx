import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconSettings,
  IconDeviceGamepad2,
  IconBroadcast,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/primitives/status-pill";
import { ConfigsPanel } from "@/components/assignments/configs-panel";
import { Skeleton } from "@/components/ui/skeleton";

type GameRow = {
  id: string;
  name: string;
  slug: string;
  hosting: "hosted" | "external";
  status: string;
};

type PlatformRow = {
  id: string;
  name: string;
  slug: string;
};

type AssignmentRow = {
  id: string;
  gameId: string;
  platformId: string;
  status: "active" | "disabled";
  createdAt: string;
};

export const Route = createFileRoute(
  "/o/$orgSlug/games/$gameSlug/assignments/$platformSlug",
)({
  head: () => ({ meta: [{ title: "Assignment · Wasanni" }] }),
  component: AssignmentDetailPage,
});

function AssignmentDetailPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const { gameSlug, platformSlug } = useParams({
    from: "/o/$orgSlug/games/$gameSlug/assignments/$platformSlug",
  });

  const { data: game } = useQuery({
    queryKey: ["game", organizationId, gameSlug],
    queryFn: async () => {
      const { games } = await apiFetch<{ games: GameRow[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      );
      return games.find((row) => row.slug === gameSlug) ?? null;
    },
  });

  const { data: platform } = useQuery({
    queryKey: ["platform", organizationId, platformSlug],
    queryFn: async () => {
      const { platforms } = await apiFetch<{ platforms: PlatformRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      );
      return platforms.find((row) => row.slug === platformSlug) ?? null;
    },
  });

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", organizationId, game?.id, platform?.id],
    queryFn: async () => {
      if (!game || !platform) return null;

      const { assignments } = await apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/games/${game.id}/assignments`,
      );

      return assignments.find((row) => row.platformId === platform.id) ?? null;
    },
    enabled: Boolean(game && platform),
  });

  if (!game || !platform) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/o/$orgSlug/games"
          params={{ orgSlug }}
          className="hover:text-foreground"
        >
          Games
        </Link>
        <span>/</span>
        <span className="text-foreground">{game.name}</span>
        <span>/</span>
        <span className="text-foreground">{platform.name}</span>
      </div>

      <PageHeader
        title={`${game.name} on ${platform.name}`}
        description="Configs control the session duration, the score rules, and the score verification for this game on this platform. A game can have many configs on the same platform."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="gap-1 font-mono">
              <IconDeviceGamepad2 className="size-3" />
              {game.slug}
            </Badge>
            <Badge variant="blue" className="gap-1 font-mono">
              <IconBroadcast className="size-3" />
              {platform.slug}
            </Badge>
            {assignment && <StatusPill status={assignment.status} />}
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !assignment ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <IconSettings className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">This game is not assigned</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The game is not assigned to {platform.name}. Assign it first, then
            come back for the configs.
          </p>
          <Link
            to="/o/$orgSlug/assignments"
            params={{ orgSlug }}
            className="mt-4 inline-block text-xs text-blue-soft hover:underline"
          >
            Go to assignments
          </Link>
        </div>
      ) : (
        <ConfigsPanel
          organizationId={organizationId}
          gameId={game.id}
          assignmentId={assignment.id}
          gameHosting={game.hosting}
        />
      )}
    </div>
  );
}
