import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconSwords } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";
import type { BracketMatch, BracketView, TournamentRow } from "@/lib/tournament-types";
import { CompleteMatchDialog } from "./complete-match-dialog";

export function TournamentMatchesPanel({
  organizationId,
  tournament,
}: {
  organizationId: string;
  tournament: TournamentRow;
}) {
  const queryClient = useQueryClient();
  const [completing, setCompleting] = React.useState<BracketMatch | null>(null);

  const { data: bracket, isLoading } = useQuery({
    queryKey: ["tournament-bracket", organizationId, tournament.id],
    queryFn: () =>
      apiFetch<{ bracket: BracketView }>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/bracket`,
      ).then((response) => response.bracket),
  });

  const matches = (bracket?.rounds ?? []).flatMap((round) => round.matches);

  const columns: DataTableColumn<BracketMatch>[] = [
    {
      key: "bracketRound",
      header: "Round",
      sortValue: (row) => row.bracketRound * 100 + row.bracketSlot,
      render: (row) => (
        <Badge variant="muted" className="font-mono text-[10px]">
          R{row.bracketRound} · M{row.bracketSlot + 1}
        </Badge>
      ),
    },
    {
      key: "participants",
      header: "Matchup",
      sortValue: (row) => row.participants.map((p) => p.displayName ?? p.externalUserId).join(" "),
      render: (row) => {
        const home = row.participants.find((participant) => participant.slot === 0);
        const away = row.participants.find((participant) => participant.slot === 1);

        return (
          <div className="flex items-center gap-2 text-xs">
            <span className={home ? "font-medium" : "text-muted-foreground"}>
              {home?.displayName ?? home?.externalUserId ?? "TBD"}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className={away ? "font-medium" : "text-muted-foreground"}>
              {away?.displayName ?? away?.externalUserId ?? "TBD"}
            </span>
          </div>
        );
      },
    },
    {
      key: "scores",
      header: "Scores",
      sortValue: (row) => row.participants[0]?.score ?? -1,
      render: (row) => {
        if (row.participants.length < 2) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }

        return (
          <span className="font-mono text-xs tabular-nums">
            {row.participants[0]?.score ?? "—"} — {row.participants[1]?.score ?? "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => {
        const canComplete =
          row.status === "active" && row.participants.length >= 2 && row.winnerParticipantId === null;

        if (!canComplete) return null;

        return (
          <Button variant="outline" size="sm" onClick={() => setCompleting(row)}>
            Complete
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Matches</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {matches.length} matches across {bracket?.rounds.length ?? 0} rounds.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={matches}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconSwords className="size-5" />}
            title="No matches yet"
            description="Matches appear once the bracket is seeded from the Overview tab."
          />
        }
      />

      <CompleteMatchDialog
        open={completing !== null}
        onOpenChange={(open) => !open && setCompleting(null)}
        organizationId={organizationId}
        match={completing}
        onCompleted={() => {
          setCompleting(null);
          queryClient.invalidateQueries({
            queryKey: ["tournament-bracket", organizationId, tournament.id],
          });
          queryClient.invalidateQueries({ queryKey: ["tournaments", organizationId] });
        }}
      />
    </div>
  );
}
