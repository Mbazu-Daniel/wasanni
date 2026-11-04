import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconLink,
  IconDeviceGamepad2,
  IconBroadcast,
  IconPlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";
import { Skeleton } from "@/components/ui/skeleton";

type AssignmentRow = {
  id: string;
  gameId: string;
  platformId: string;
  status: "active" | "disabled";
  createdAt: string;
  gameName: string;
  gameSlug: string;
  gameHosting: "hosted" | "external";
  gameStatus: string;
  platformName: string;
  platformSlug: string;
};

export const Route = createFileRoute("/$orgSlug/assignments/")({
  head: () => ({ meta: [{ title: "Assignments · Wasanni" }] }),
  component: AssignmentsMatrixPage,
});

function AssignmentsMatrixPage() {
  const { org } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const organizationId = org?.id ?? "";

  const [gameFilter, setGameFilter] = React.useState("");
  const [platformFilter, setPlatformFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "disabled"
  >("all");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignGameId, setAssignGameId] = React.useState("");
  const [assignPlatformId, setAssignPlatformId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);
  const [unassigning, setUnassigning] = React.useState<AssignmentRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/assignments`,
      ).then((response) => response.assignments),
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: { id: string; name: string; slug: string }[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) => response.games),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{
        platforms: { id: string; name: string; slug: string }[];
      }>(`/api/v1/organizations/${organizationId}/platforms`).then(
        (response) => response.platforms,
      ),
  });

  const filtered = assignments.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (gameFilter !== "" && row.gameId !== gameFilter) return false;
    if (platformFilter !== "" && row.platformId !== platformFilter) return false;
    return true;
  });

  const counts = {
    total: assignments.length,
    active: assignments.filter((row) => row.status === "active").length,
    games: new Set(assignments.map((row) => row.gameId)).size,
    platforms: new Set(assignments.map((row) => row.platformId)).size,
  };

  async function assign() {
    if (assignGameId === "" || assignPlatformId === "") return;

    setAssigning(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${assignGameId}/assignments`,
        { method: "POST", data: JSON.stringify({ platformId: assignPlatformId }) },
      );
      toast.success("Game assigned");
      setAssignOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["assignments", organizationId, "all"],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign");
    } finally {
      setAssigning(false);
    }
  }

  async function unassign() {
    if (unassigning === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${unassigning.gameId}/assignments/${unassigning.id}`,
        { method: "DELETE" },
      );
      toast.success("Game unassigned");
      setUnassigning(null);
      queryClient.invalidateQueries({
        queryKey: ["assignments", organizationId, "all"],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unassign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assignments"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setAssignOpen(true)}>
            <IconPlus className="size-3.5" />
            Assign
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total links" value={counts.total} />
        <Metric label="Active" value={counts.active} />
        <Metric label="Games assigned" value={counts.games} />
        <Metric label="Platforms used" value={counts.platforms} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <SearchableSelect
          value={gameFilter}
          onValueChange={setGameFilter}
          placeholder="All games"
          options={[
            { value: "", label: "All games" },
            ...games.map((game) => ({ value: game.id, label: game.name })),
          ]}
          className="w-48"
        />
        <SearchableSelect
          value={platformFilter}
          onValueChange={setPlatformFilter}
          placeholder="All platforms"
          options={[
            { value: "", label: "All platforms" },
            ...platforms.map((platform) => ({
              value: platform.id,
              label: platform.name,
            })),
          ]}
          className="w-48"
        />
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {(["all", "active", "disabled"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={
                statusFilter === option
                  ? "rounded bg-ink/[0.08] px-2.5 py-1 capitalize text-foreground"
                  : "rounded px-2.5 py-1 capitalize text-muted-foreground hover:text-foreground"
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={<IconLink className="size-5" />}
            title="No assignments yet"
            description="Assign a game to a platform so it can open sessions and receive scores."
            primary={
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setAssignOpen(true)}
              >
                <IconPlus className="size-3.5" />
                Assign a game
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No assignments match this filter.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/40">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Game
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Platform
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Assigned
                  </th>
                  <th className="w-28 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border transition-colors hover:bg-ink/[0.04]"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <IconDeviceGamepad2 className="size-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.gameName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {row.gameSlug}
                          </p>
                        </div>
                        <StatusPill status={row.gameStatus} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <IconBroadcast className="size-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {row.platformName}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {row.platformSlug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-300"
                        onClick={() => setUnassigning(row)}
                      >
                        Unassign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAssignGameId("");
            setAssignPlatformId("");
          }
          setAssignOpen(open);
        }}
        title="Assign a game to a platform"
      >
        <div className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label>Game</Label>
            <Select
              value={assignGameId}
              onValueChange={setAssignGameId}
              options={games.map((game) => ({
                value: game.id,
                label: `${game.name} (${game.slug})`,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              value={assignPlatformId}
              onValueChange={setAssignPlatformId}
              options={platforms.map((platform) => ({
                value: platform.id,
                label: `${platform.name} (${platform.slug})`,
              }))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={assign}
              disabled={assigning || assignGameId === "" || assignPlatformId === ""}
            >
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={unassigning !== null}
        onOpenChange={(open) => !open && setUnassigning(null)}
        title={`Unassign ${unassigning?.gameName ?? "this game"}?`}
        description="The platform stops opening sessions for this game. The game is not deleted."
        confirmLabel="Unassign"
        destructive
        busy={busy}
        onConfirm={unassign}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
