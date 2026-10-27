import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconLink,
  IconDeviceGamepad2,
  IconBroadcast,
  IconSettings,
  IconSearch,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/o/$orgSlug/assignments/")({
  head: () => ({ meta: [{ title: "Assignments · Wasanni" }] }),
  component: AssignmentsMatrixPage,
});

function AssignmentsMatrixPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "disabled"
  >("all");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ assignments: AssignmentRow[] }>(
        `/api/v1/organizations/${organizationId}/assignments`,
      ).then((response) => response.assignments),
  });

  const filtered = assignments.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;

    if (query.trim()) {
      const needle = query.toLowerCase();

      return (
        row.gameName.toLowerCase().includes(needle) ||
        row.gameSlug.toLowerCase().includes(needle) ||
        row.platformName.toLowerCase().includes(needle) ||
        row.platformSlug.toLowerCase().includes(needle)
      );
    }

    return true;
  });

  const counts = {
    total: assignments.length,
    active: assignments.filter((row) => row.status === "active").length,
    games: new Set(assignments.map((row) => row.gameId)).size,
    platforms: new Set(assignments.map((row) => row.platformId)).size,
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Every game-to-platform link in this organization. A platform only sees the games assigned to it."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total links" value={counts.total} />
        <Metric label="Active" value={counts.active} />
        <Metric label="Games assigned" value={counts.games} />
        <Metric label="Platforms used" value={counts.platforms} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by game or platform"
            className="pl-8"
          />
        </div>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {(["all", "active", "disabled"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={
                statusFilter === option
                  ? "rounded bg-white/[0.06] px-2.5 py-1 capitalize text-foreground"
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
            description="Assign a game to a platform from the game's Assignments tab. Every assignment you create appears here."
            primary={
              <Link to="/o/$orgSlug/games" params={{ orgSlug }}>
                <Button variant="outline" className="gap-1.5">
                  <IconDeviceGamepad2 className="size-3.5" />
                  Go to games
                </Button>
              </Link>
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
                  <th className="w-32 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border transition-colors hover:bg-white/[0.02]"
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
                      <Link
                        to="/o/$orgSlug/platforms/$platformSlug"
                        params={{ orgSlug, platformSlug: row.platformSlug }}
                        search={{ tab: "games" }}
                        className="group flex items-center gap-2"
                      >
                        <IconBroadcast className="size-3.5 text-muted-foreground group-hover:text-blue-soft" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium group-hover:text-blue-soft">
                            {row.platformName}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {row.platformSlug}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Link
                        to="/o/$orgSlug/games/$gameSlug/assignments/$platformSlug"
                        params={{
                          orgSlug,
                          gameSlug: row.gameSlug,
                          platformSlug: row.platformSlug,
                        }}
                      >
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          <IconSettings className="size-3.5" />
                          Configs
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
