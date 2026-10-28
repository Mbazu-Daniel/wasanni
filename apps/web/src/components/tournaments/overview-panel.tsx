import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconPlayerPlay,
  IconBrackets,
  IconCircleCheck,
  IconX,
  IconUserPlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/primitives/status-pill";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import type { ParticipantRow, TournamentRow } from "@/lib/tournament-types";
import { RegisterParticipantModal } from "./register-participant-modal";

export function TournamentOverviewPanel({
  organizationId,
  tournament,
  onRefresh,
}: {
  organizationId: string;
  tournament: TournamentRow;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = React.useState<null | "open" | "cancel" | "complete" | "seed">(null);
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const { data: participants = [] } = useQuery({
    queryKey: ["participants", organizationId, tournament.id],
    queryFn: () =>
      apiFetch<{ participants: ParticipantRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/participants`,
      ).then((response) => response.participants),
  });

  const active = participants.filter((row) => row.status !== "withdrawn");

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["participants", organizationId, tournament.id],
    });
    onRefresh();
  };

  async function action(kind: "open" | "cancel" | "complete" | "seed") {
    setBusy(true);

    try {
      if (kind === "open") {
        await apiFetch(
          `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/open`,
          { method: "POST" },
        );
        toast.success("Registration opened");
      } else if (kind === "cancel") {
        await apiFetch(
          `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/cancel`,
          { method: "POST" },
        );
        toast.success("Tournament cancelled");
      } else if (kind === "complete") {
        await apiFetch(
          `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/complete`,
          { method: "POST" },
        );
        toast.success("Tournament marked complete");
      } else {
        await apiFetch(
          `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/seed`,
          { method: "POST" },
        );
        toast.success("Bracket generated");
        queryClient.invalidateQueries({
          queryKey: ["tournament-bracket", organizationId, tournament.id],
        });
      }

      setConfirm(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const canOpen = tournament.status === "draft";
  const canSeed =
    tournament.status === "open" && tournament.format === "bracket" && active.length >= 2;
  const canComplete = tournament.status === "open" && tournament.format === "leaderboard";
  const canCancel = tournament.status !== "completed" && tournament.status !== "cancelled";
  const canRegister =
    (tournament.status === "open" || tournament.status === "draft") &&
    tournament.platform !== undefined &&
    tournament.platform !== null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Participants" value={active.length} />
        <Metric label="Format" value={tournament.format} small />
        <Metric
          label="Max participants"
          value={tournament.maxParticipants ?? "Unlimited"}
          small
        />
        <Metric
          label="Scored"
          value={active.filter((row) => row.status !== "registered").length}
        />
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Actions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tournament.status === "draft" &&
                "Open registration to start accepting participants."}
              {tournament.status === "open" &&
                tournament.format === "bracket" &&
                "Add at least 2 participants, then seed the bracket to begin."}
              {tournament.status === "open" &&
                tournament.format === "leaderboard" &&
                "Accepting scores. Mark complete when the tournament is done."}
              {tournament.status === "running" &&
                "Matches advance automatically as scores come in."}
              {tournament.status === "completed" && "This tournament is finished."}
              {tournament.status === "cancelled" && "This tournament was cancelled."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canRegister && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setRegisterOpen(true)}
              >
                <IconUserPlus className="size-3.5" />
                Register player
              </Button>
            )}
            {canOpen && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirm("open")}
              >
                <IconPlayerPlay className="size-3.5" />
                Open registration
              </Button>
            )}
            {canSeed && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirm("seed")}
              >
                <IconBrackets className="size-3.5" />
                Seed and start
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setConfirm("complete")}
              >
                <IconCircleCheck className="size-3.5" />
                Mark complete
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-rose-300"
                onClick={() => setConfirm("cancel")}
              >
                <IconX className="size-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <p className="text-sm font-semibold">Details</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <Row label="Format">
            <Badge variant="muted" className="capitalize">
              {tournament.format}
            </Badge>
          </Row>
          <Row label="Status">
            <StatusPill status={tournament.status} />
          </Row>
          {tournament.game && <Row label="Game">{tournament.game.name}</Row>}
          {tournament.platform && (
            <Row label="Platform">{tournament.platform.name}</Row>
          )}
          {tournament.startsAt && (
            <Row label="Starts">{formatDateTime(tournament.startsAt)}</Row>
          )}
          {tournament.endsAt && (
            <Row label="Ends">{formatDateTime(tournament.endsAt)}</Row>
          )}
          {tournament.startedAt && (
            <Row label="Started">{formatDateTime(tournament.startedAt)}</Row>
          )}
          {tournament.completedAt && (
            <Row label="Completed">{formatDateTime(tournament.completedAt)}</Row>
          )}
          <Row label="Created">{formatDateTime(tournament.createdAt)}</Row>
        </dl>
      </div>

      {tournament.description && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <p className="text-sm font-semibold">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {tournament.description}
          </p>
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
          onRegistered={refresh}
        />
      )}

      <ConfirmDialog
        open={confirm === "open"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Open registration?"
        description="Participants can start registering. Registration closes when you seed the bracket or mark the tournament complete."
        confirmLabel="Open registration"
        busy={busy}
        onConfirm={() => action("open")}
      />

      <ConfirmDialog
        open={confirm === "seed"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Seed the bracket and start?"
        description={`This creates the bracket for ${active.length} participants and starts the tournament. The bracket cannot be regenerated.`}
        confirmLabel="Seed and start"
        busy={busy}
        onConfirm={() => action("seed")}
      />

      <ConfirmDialog
        open={confirm === "complete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Mark this tournament complete?"
        description="The leaderboard freezes. Scores cannot be submitted for this tournament after this."
        confirmLabel="Mark complete"
        busy={busy}
        onConfirm={() => action("complete")}
      />

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Cancel this tournament?"
        description="Sessions in flight keep their data, but no new registrations or scores are accepted. This cannot be undone."
        confirmLabel="Cancel tournament"
        destructive
        busy={busy}
        onConfirm={() => action("cancel")}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          small
            ? "mt-1 text-sm font-semibold"
            : "mt-1 font-mono text-2xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
