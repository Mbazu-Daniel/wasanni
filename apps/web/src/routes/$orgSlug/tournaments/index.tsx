import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconMedal,
  IconPlus,
  IconTrophy,
  IconBrackets,
  IconUsers,
  IconCalendar,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import type { TournamentRow } from "@/lib/tournament-types";

export const Route = createFileRoute("/$orgSlug/tournaments/")({
  head: () => ({ meta: [{ title: "Tournaments · Wasanni" }] }),
  component: TournamentsListPage,
});

function TournamentsListPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "draft" | "open" | "running" | "completed"
  >("all");

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", organizationId],
    queryFn: () =>
      apiFetch<{ tournaments: TournamentRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments`,
      ).then((response) => response.tournaments),
  });

  const filtered =
    statusFilter === "all"
      ? tournaments
      : tournaments.filter((tournament) => tournament.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Tournaments"
        actions={
          <Link to="/$orgSlug/tournaments/new" params={{ orgSlug }}>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="size-3.5" />
              New tournament
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex rounded-lg border border-border p-0.5 text-xs">
        {(["all", "draft", "open", "running", "completed"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatusFilter(option)}
            className={
              statusFilter === option
                ? "flex-1 rounded bg-ink/[0.08] px-2.5 py-1.5 capitalize text-foreground"
                : "flex-1 rounded px-2.5 py-1.5 capitalize text-muted-foreground hover:text-foreground"
            }
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={<IconMedal className="size-5" />}
          title="No tournaments yet"
          description="Create a tournament to rank players on a leaderboard or advance them through a bracket."
          primary={
            <Link to="/$orgSlug/tournaments/new" params={{ orgSlug }}>
              <Button className="gap-1.5">
                <IconPlus className="size-3.5" />
                Create tournament
              </Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No tournaments with this status.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {filtered.map((tournament) => (
            <Link
              key={tournament.id}
              to="/$orgSlug/tournaments/$tournamentSlug"
              params={{ orgSlug, tournamentSlug: tournament.slug }}
              search={{ tab: "overview" }}
              className="group flex flex-col rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-pink/30 hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {tournament.format === "bracket" ? (
                    <IconBrackets className="size-4 shrink-0 text-blue" />
                  ) : (
                    <IconTrophy className="size-4 shrink-0 text-pink" />
                  )}
                  <h3 className="truncate text-sm font-semibold">
                    {tournament.name}
                  </h3>
                </div>
                <StatusPill status={tournament.status} />
              </div>

              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {tournament.slug}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="muted" className="text-[10px] capitalize">
                  {tournament.format}
                </Badge>
                {tournament.game && (
                  <Badge variant="muted" className="text-[10px]">
                    {tournament.game.name}
                  </Badge>
                )}
                {tournament.platform && (
                  <Badge variant="blue" className="text-[10px]">
                    {tournament.platform.name}
                  </Badge>
                )}
              </div>

              <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-muted-foreground">
                {tournament.maxParticipants !== null && (
                  <span className="flex items-center gap-1">
                    <IconUsers className="size-3" />
                    max {tournament.maxParticipants}
                  </span>
                )}
                {tournament.startsAt !== null && (
                  <span className="flex items-center gap-1">
                    <IconCalendar className="size-3" />
                    {formatDateTime(tournament.startsAt)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
