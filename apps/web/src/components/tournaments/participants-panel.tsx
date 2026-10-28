import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconUsers, IconUserPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { StatusPill } from "@/components/primitives/status-pill";
import type { ParticipantRow, TournamentRow } from "@/lib/tournament-types";
import { RegisterParticipantModal } from "./register-participant-modal";

export function TournamentParticipantsPanel({
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
  const [withdrawing, setWithdrawing] = React.useState<ParticipantRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["participants", organizationId, tournament.id],
    queryFn: () =>
      apiFetch<{ participants: ParticipantRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/participants`,
      ).then((response) => response.participants),
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["participants", organizationId, tournament.id],
    });

  async function withdraw() {
    if (withdrawing === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/participants/${withdrawing.id}`,
        { method: "DELETE" },
      );
      toast.success("Participant withdrawn");
      setWithdrawing(null);
      refresh();
      onRefresh();
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

  const columns: DataTableColumn<ParticipantRow>[] = [
    {
      key: "seed",
      header: "Seed",
      sortValue: (row) => row.seed ?? 999,
      render: (row) =>
        row.seed === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-ink/[0.06] font-mono text-xs font-semibold">
            {row.seed}
          </span>
        ),
    },
    {
      key: "displayName",
      header: "Player",
      sortValue: (row) => row.displayName ?? row.externalUserId,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.displayName ?? row.externalUserId}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {row.externalUserId}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "registeredAt",
      header: "Registered",
      sortValue: (row) => row.registeredAt,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.registeredAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => {
        if (!canWithdraw || row.status === "withdrawn") return null;

        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-300"
            onClick={() => setWithdrawing(row)}
          >
            Withdraw
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            Participants ({participants.filter((row) => row.status !== "withdrawn").length})
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tournament.platform
              ? `Players from ${tournament.platform.name}.`
              : "No platform — participants cannot be registered."}
          </p>
        </div>
        {canRegister && (
          <Button size="sm" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
            <IconUserPlus className="size-3.5" />
            Register player
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={participants}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconUsers className="size-5" />}
            title="No participants yet"
            description={
              tournament.platform
                ? "Register the first player to seed the bracket or start receiving scores."
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
        }
      />

      {tournament.platform && (
        <RegisterParticipantModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          organizationId={organizationId}
          tournamentId={tournament.id}
          platformId={tournament.platform.id}
          platformName={tournament.platform.name}
          onRegistered={() => {
            refresh();
            onRefresh();
          }}
        />
      )}

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => !open && setWithdrawing(null)}
        title={`Withdraw ${withdrawing?.displayName ?? withdrawing?.externalUserId ?? "participant"}?`}
        description="They cannot play further matches or submit scores for this tournament. This cannot be undone."
        confirmLabel="Withdraw participant"
        destructive
        busy={busy}
        onConfirm={withdraw}
      />
    </div>
  );
}
