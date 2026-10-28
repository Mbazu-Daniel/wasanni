import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconBroadcast,
  IconCheck,
  IconDeviceGamepad2,
  IconTrophy,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { StatusPill } from "@/components/primitives/status-pill";
import type { TournamentRow } from "@/lib/tournament-types";
import type { MatchParticipantRow, MatchWithParticipants } from "@/lib/match-types";

type GameOption = { id: string; name: string; slug: string };
type PlatformOption = { id: string; name: string; slug: string };

export const Route = createFileRoute("/$orgSlug/matches/$matchId")({
  head: () => ({ meta: [{ title: "Match · Wasanni" }] }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { org } = Route.useRouteContext();
  const { matchId } = Route.useParams();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const queryClient = useQueryClient();

  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = React.useState<string | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["match", organizationId, matchId],
    queryFn: () =>
      apiFetch<MatchWithParticipants>(
        `/api/v1/organizations/${organizationId}/matches/${matchId}`,
      ),
    enabled: org !== null,
    refetchInterval: (query) =>
      query.state.data?.match.status === "active" ? 3000 : false,
  });

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

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformOption[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((r) => r.platforms),
    enabled: org !== null,
  });

  const platformById = new Map(platforms.map((entry) => [entry.id, entry]));

  async function complete() {
    setBusy(true);

    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/matches/${matchId}/complete`,
        {
          method: "POST",
          data: JSON.stringify(
            selectedWinnerId === null ? {} : { winnerParticipantId: selectedWinnerId },
          ),
        },
      );

      toast.success("Match completed");
      setCompleteOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["match", organizationId, matchId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["matches", organizationId],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not complete the match",
      );
    } finally {
      setBusy(false);
    }
  }

  if (org === null || isLoading || data === undefined) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const { match, participants } = data;
  const game = games.find((entry) => entry.id === match.gameId);
  const tournament = tournaments.find((entry) => entry.id === match.tournamentId);

  const canComplete =
    (match.status === "active" || match.status === "pending") &&
    match.winnerParticipantId === null &&
    participants.length >= 2;

  const topScore = participants.reduce(
    (max, participant) =>
      participant.score !== null && participant.score > max
        ? participant.score
        : max,
    -1,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-6 text-xs text-muted-foreground">
        <Link
          to="/$orgSlug/matches"
          params={{ orgSlug }}
          className="hover:text-foreground"
        >
          Matches
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{match.name ?? match.id}</span>
      </div>

      <PageHeader
        title={match.name ?? "Match"}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={match.status} />
            {canComplete && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setSelectedWinnerId(null);
                  setCompleteOpen(true);
                }}
              >
                <IconCheck className="size-3.5" />
                Complete match
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Game" icon={IconDeviceGamepad2}>
          {game?.name ?? match.gameId}
        </Metric>
        <Metric label="Tournament" icon={IconTrophy}>
          {tournament?.name ?? (
            <span className="text-muted-foreground">standalone</span>
          )}
        </Metric>
        <Metric label="Participants">{participants.length}</Metric>
        <Metric label="Created">{formatDateTime(match.createdAt)}</Metric>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Scoreboard ({participants.length})
          </h2>
          {match.status === "active" && (
            <Badge variant="success" className="gap-1">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </Badge>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/40">
              <tr>
                <Th className="w-12">Pos</Th>
                <Th>Player</Th>
                <Th>Platform</Th>
                <Th align="right">Score</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <ScoreRow
                  key={participant.id}
                  participant={participant}
                  platformName={
                    platformById.get(participant.platformId)?.name ??
                    participant.platformId
                  }
                  winner={match.winnerParticipantId === participant.id}
                  top={participant.score !== null && participant.score === topScore && topScore > 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete this match?"
        description="Pick a winner, or leave it empty to record a draw. This cannot be undone."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCompleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={complete} disabled={busy}>
              {busy ? "Completing…" : "Complete match"}
            </Button>
          </>
        }
      >
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setSelectedWinnerId(null)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border-2 p-3 text-left transition-colors",
              selectedWinnerId === null
                ? "border-border bg-ink/[0.06]"
                : "border-border bg-ink/[0.04] hover:border-pink/40",
            )}
          >
            <span className="text-sm font-medium text-muted-foreground">
              Draw (no winner)
            </span>
            {selectedWinnerId === null && (
              <span className="grid size-4 place-items-center rounded-full bg-foreground text-[10px] text-background">
                ✓
              </span>
            )}
          </button>

          {participants.map((participant) => (
            <button
              key={participant.id}
              type="button"
              onClick={() => setSelectedWinnerId(participant.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border-2 p-3 text-left transition-colors",
                selectedWinnerId === participant.id
                  ? "border-pink bg-pink/5"
                  : "border-border bg-ink/[0.04] hover:border-pink/40",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {participant.displayName ?? participant.externalUserId}
                </p>
                {participant.score !== null && (
                  <p className="text-xs text-muted-foreground">
                    score {participant.score}
                  </p>
                )}
              </div>
              {selectedWinnerId === participant.id && (
                <span className="grid size-4 place-items-center rounded-full bg-pink text-[10px] text-pink-foreground">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function ScoreRow({
  participant,
  platformName,
  winner,
  top,
}: {
  participant: MatchParticipantRow;
  platformName: string;
  winner: boolean;
  top: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-border transition-colors",
        winner && "bg-emerald-400/[0.04]",
      )}
    >
      <td className="px-4 py-3 align-middle">
        {participant.placement === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : participant.placement === 1 ? (
          <span className="grid size-7 place-items-center rounded-full bg-pink/15 font-mono text-xs font-bold text-pink">
            1
          </span>
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-ink/[0.06] font-mono text-xs text-muted-foreground">
            {participant.placement}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          {winner && <IconTrophy className="size-3.5 shrink-0 text-pink" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {participant.displayName ?? participant.externalUserId}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {participant.externalUserId}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          <IconBroadcast className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs">{platformName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right align-middle">
        {participant.score === null ? (
          <span className="text-xs text-muted-foreground">waiting…</span>
        ) : (
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              top && "font-semibold text-foreground",
            )}
          >
            {participant.score}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-middle">
        <Badge
          variant={
            participant.outcome === "won"
              ? "success"
              : participant.outcome === "draw"
                ? "warning"
                : "muted"
          }
          className="text-[10px] capitalize"
        >
          {participant.outcome}
        </Badge>
      </td>
    </tr>
  );
}

function Th({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Metric({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" />}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium">{children}</p>
    </div>
  );
}
