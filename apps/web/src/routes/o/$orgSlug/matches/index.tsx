import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDeviceGamepad2,
  IconPlus,
  IconSwords,
  IconTrophy,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/primitives/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";
import type { TournamentRow } from "@/lib/tournament-types";
import type {
  MatchListResponse,
  MatchWithParticipants,
} from "@/lib/match-types";

type GameOption = { id: string; name: string; slug: string };

export const Route = createFileRoute("/o/$orgSlug/matches/")({
  head: () => ({ meta: [{ title: "Matches · Wasanni" }] }),
  component: MatchesPage,
});

function MatchesPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const navigate = useNavigate();

  const [gameId, setGameId] = React.useState("");
  const [tournamentId, setTournamentId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [history, setHistory] = React.useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const activeCursor = history[pageIndex] ?? null;

  React.useEffect(() => {
    setHistory([null]);
    setPageIndex(0);
  }, [gameId, tournamentId, status]);

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameOption[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((r) => r.games),
    enabled: org !== null,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", organizationId],
    queryFn: () =>
      apiFetch<{ tournaments: TournamentRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments`,
      ).then((r) => r.tournaments),
    enabled: org !== null,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "matches",
      organizationId,
      { gameId, tournamentId, status, cursor: activeCursor },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (gameId) params.set("gameId", gameId);
      if (tournamentId) params.set("tournamentId", tournamentId);
      if (status) params.set("status", status);
      if (activeCursor) params.set("cursor", activeCursor);
      params.set("limit", "50");

      return apiFetch<MatchListResponse>(
        `/api/v1/organizations/${organizationId}/matches?${params.toString()}`,
      );
    },
    enabled: org !== null,
  });

  const gamesById = new Map(games.map((entry) => [entry.id, entry]));
  const tournamentsById = new Map(
    tournaments.map((entry) => [entry.id, entry]),
  );

  const columns: DataTableColumn<MatchWithParticipants>[] = [
    {
      key: "match",
      header: "Match",
      sortValue: (row) => row.match.name ?? row.match.id,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.match.name ?? "Unnamed match"}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {row.match.id}
          </p>
        </div>
      ),
    },
    {
      key: "game",
      header: "Game",
      sortValue: (row) => gamesById.get(row.match.gameId)?.name ?? "",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <IconDeviceGamepad2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs">
            {gamesById.get(row.match.gameId)?.name ?? row.match.gameId}
          </span>
        </div>
      ),
    },
    {
      key: "tournament",
      header: "Tournament",
      sortValue: (row) =>
        row.match.tournamentId === null
          ? ""
          : (tournamentsById.get(row.match.tournamentId)?.name ?? ""),
      render: (row) => {
        if (row.match.tournamentId === null) {
          return <span className="text-xs text-muted-foreground">standalone</span>;
        }

        return (
          <div className="flex items-center gap-1.5">
            <IconTrophy className="size-3.5 text-pink" />
            <span className="min-w-0 truncate text-xs">
              {tournamentsById.get(row.match.tournamentId)?.name ??
                row.match.tournamentId}
            </span>
          </div>
        );
      },
    },
    {
      key: "matchup",
      header: "Matchup",
      render: (row) => {
        if (row.participants.length === 0) {
          return (
            <span className="text-xs text-muted-foreground">
              no participants
            </span>
          );
        }

        const names = row.participants
          .slice(0, 3)
          .map((participant) => participant.displayName ?? participant.externalUserId);
        const overflow = row.participants.length - names.length;

        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xs">{names.join(", ")}</span>
            {overflow > 0 && (
              <Badge variant="muted" className="text-[10px]">
                +{overflow}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.match.status,
      render: (row) => <StatusPill status={row.match.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      sortValue: (row) => row.match.createdAt,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.match.createdAt)}
        </span>
      ),
    },
  ];

  if (org === null) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  return (
    <div>
      <PageHeader
        title="Matches"
        description="Group sessions from several players into one match — on its own, or as part of a tournament."
        actions={
          <Link to="/o/$orgSlug/matches/new" params={{ orgSlug }}>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="size-3.5" />
              New match
            </Button>
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Game</label>
          <Select
            value={gameId}
            onValueChange={setGameId}
            options={[
              { value: "", label: "All games" },
              ...games.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Tournament</label>
          <Select
            value={tournamentId}
            onValueChange={setTournamentId}
            options={[
              { value: "", label: "All tournaments" },
              ...tournaments.map((entry) => ({
                value: entry.id,
                label: entry.name,
              })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Status</label>
          <Select
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        getRowId={(row) => row.match.id}
        onRowClick={(row) =>
          navigate({
            to: "/o/$orgSlug/matches/$matchId",
            params: { orgSlug, matchId: row.match.id },
          })
        }
        empty={
          <EmptyState
            icon={<IconSwords className="size-5" />}
            title="No matches yet"
            description="A match groups sessions from several players. Create one directly, or let a bracket tournament create them for you."
            primary={
              <Link to="/o/$orgSlug/matches/new" params={{ orgSlug }}>
                <Button className="gap-1.5">
                  <IconPlus className="size-3.5" />
                  Create match
                </Button>
              </Link>
            }
          />
        }
      />

      {(data?.data.length ?? 0) > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {pageIndex + 1}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((value) => Math.max(value - 1, 0))}
              disabled={pageIndex === 0}
            >
              <IconChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.page.hasMore}
              onClick={() => {
                const cursor = data?.page.cursor;
                if (!cursor) return;

                setHistory((prev) => [...prev.slice(0, pageIndex + 1), cursor]);
                setPageIndex((value) => value + 1);
              }}
            >
              Next
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
