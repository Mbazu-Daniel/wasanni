import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronDown, IconFlag, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { EmptyState } from "@/components/primitives/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/primitives/status-pill";
import type { Standings, TournamentRow } from "@/lib/tournament-types";
import { RegisterParticipantModal } from "./register-participant-modal";

type PlayerSession = {
  sessionId: string;
  status: string;
  score: number | null;
  flagged: boolean;
  flags: string[];
  startedAt: string;
  submittedAt: string | null;
};

function PlayerSessions({
  organizationId,
  tournamentId,
  participantId,
}: {
  organizationId: string;
  tournamentId: string;
  participantId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["player-sessions", organizationId, tournamentId, participantId],
    queryFn: () =>
      apiFetch<{ sessions: PlayerSession[] }>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournamentId}/participants/${participantId}/sessions`,
      ).then((r) => r.sessions),
  });

  if (isLoading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Loading sessions…</div>;
  }

  if (data === undefined || data.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">No sessions yet.</div>;
  }

  return (
    <ul className="space-y-1 px-4 py-3">
      {data.map((session) => (
        <li key={session.sessionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-mono text-muted-foreground">
            {session.sessionId.slice(0, 8)}
          </span>
          <StatusPill status={session.status} />
          {session.score === null ? (
            <span className="text-muted-foreground">No score yet</span>
          ) : (
            <span className="font-mono font-semibold">
              {session.score}
              {session.flagged ? " · flagged" : ""}
            </span>
          )}
          <span className="text-muted-foreground">
            {formatDateTime(session.submittedAt ?? session.startedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TournamentPlayersPanel({
  organizationId,
  tournament,
  onRefresh,
}: {
  organizationId: string;
  tournament: TournamentRow;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState<{ id: string; name: string } | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const queryKey = ["tournament-players", organizationId, tournament.id];
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<Standings>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/standings`,
      ),
    refetchInterval: tournament.status === "open" ? 10_000 : false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    onRefresh();
  };

  async function withdraw() {
    if (withdrawing === null) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/participants/${withdrawing.id}`,
        { method: "DELETE" },
      );
      toast.success("Player withdrawn");
      setWithdrawing(null);
      if (expandedId === withdrawing.id) setExpandedId(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not withdraw");
    } finally {
      setBusy(false);
    }
  }

  const canWithdraw = tournament.status === "draft" || tournament.status === "open";
  const canRegister =
    (tournament.status === "open" || tournament.status === "draft") &&
    tournament.platform !== undefined &&
    tournament.platform !== null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  const rows = data !== undefined && data.format === "leaderboard" ? data.rows : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Players ({rows.length})</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ranked by best score. Select a row to see every session and how the scores came in.
          </p>
        </div>
        {canRegister && (
          <Button size="sm" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
            <IconUserPlus className="size-3.5" />
            Register player
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <EmptyState
            icon={<IconUsers className="size-5" />}
            title="No players yet"
            description={
              tournament.platform
                ? "Register the first player to start receiving scores."
                : "Assign this tournament to a platform to allow registration."
            }
            primary={
              canRegister ? (
                <Button size="sm" onClick={() => setRegisterOpen(true)} className="gap-1.5">
                  <IconUserPlus className="size-3.5" />
                  Register first player
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/40">
              <tr>
                <th className="w-12 px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Pos
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Player
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Score
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Flags
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </th>
                <th className="w-16 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.participantId;
                return (
                  <React.Fragment key={row.participantId}>
                    <tr
                      className="cursor-pointer border-t border-border transition-colors hover:bg-ink/[0.04]"
                      onClick={() => setExpandedId(expanded ? null : row.participantId)}
                    >
                      <td className="px-4 py-3 align-middle">
                        {row.position === 1 ? (
                          <span className="grid size-7 place-items-center rounded-full bg-pink/15 font-mono text-xs font-bold text-pink">
                            1
                          </span>
                        ) : (
                          <span className="grid size-7 place-items-center rounded-full bg-ink/[0.06] font-mono text-xs text-muted-foreground">
                            {row.position}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="truncate text-sm font-medium">
                          {row.displayName ?? row.externalUserId}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {row.externalUserId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        {row.score === null ? (
                          <span className="font-mono text-sm text-muted-foreground">Pending</span>
                        ) : (
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {row.score}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {row.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.flags.slice(0, 2).map((flag) => (
                              <Badge key={flag} variant="default" className="gap-1 text-[10px]">
                                <IconFlag className="size-2.5" />
                                {flag}
                              </Badge>
                            ))}
                            {row.flags.length > 2 && (
                              <Badge variant="muted" className="text-[10px]">
                                +{row.flags.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge variant="muted" className="text-[10px] capitalize">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {canWithdraw && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-300"
                              onClick={(event) => {
                                event.stopPropagation();
                                setWithdrawing({
                                  id: row.participantId,
                                  name: row.displayName ?? row.externalUserId,
                                });
                              }}
                            >
                              Withdraw
                            </Button>
                          )}
                          <IconChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-border bg-card/40">
                        <td colSpan={6} className="p-0">
                          <PlayerSessions
                            organizationId={organizationId}
                            tournamentId={tournament.id}
                            participantId={row.participantId}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tournament.platform && (
        <RegisterParticipantModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          organizationId={organizationId}
          tournamentId={tournament.id}
          platformId={tournament.platform.id}
          platformName={tournament.platform.name}
          onRegistered={() => {
            void refetch();
            onRefresh();
          }}
        />
      )}

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => !open && setWithdrawing(null)}
        title={`Withdraw ${withdrawing?.name ?? "player"}?`}
        description="Their scores stay on record, but they leave the board. This cannot be undone."
        confirmLabel="Withdraw player"
        destructive
        busy={busy}
        onConfirm={withdraw}
      />
    </div>
  );
}