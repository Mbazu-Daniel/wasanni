import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconTrophy, IconBrackets } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/primitives/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { TournamentOverviewPanel } from "@/components/tournaments/overview-panel";
import { TournamentParticipantsPanel } from "@/components/tournaments/participants-panel";
import { TournamentBracketPanel } from "@/components/tournaments/bracket-panel";
import { TournamentMatchesPanel } from "@/components/tournaments/matches-panel";
import { TournamentStandingsPanel } from "@/components/tournaments/standings-panel";
import type { TournamentRow } from "@/lib/tournament-types";

export const Route = createFileRoute("/o/$orgSlug/tournaments/$tournamentSlug")({
  head: () => ({ meta: [{ title: "Tournament · Wasanni" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      typeof search.tab === "string" &&
      ["overview", "participants", "bracket", "matches", "standings"].includes(
        search.tab,
      )
        ? search.tab
        : "overview",
  }),
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const { tournamentSlug } = useParams({
    from: "/o/$orgSlug/tournaments/$tournamentSlug",
  });
  const { tab } = Route.useSearch();

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", organizationId],
    queryFn: () =>
      apiFetch<{ tournaments: TournamentRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments`,
      ).then((response) => response.tournaments),
  });

  const summary = tournaments.find((tournament) => tournament.slug === tournamentSlug);

  const { data: tournament, isLoading, refetch } = useQuery({
    queryKey: ["tournament", organizationId, summary?.id],
    queryFn: () =>
      apiFetch<{ tournament: TournamentRow }>(
        `/api/v1/organizations/${organizationId}/tournaments/${summary!.id}`,
      ).then((response) => response.tournament),
    enabled: summary !== undefined,
  });

  if (summary === undefined) {
    return <div className="text-sm text-muted-foreground">Tournament not found.</div>;
  }

  if (isLoading || tournament === undefined) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const isBracket = tournament.format === "bracket";
  const showStandings = tournament.format === "leaderboard";

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "participants", label: "Participants" },
    ...(isBracket ? [{ value: "bracket", label: "Bracket" }] : []),
    ...(isBracket ? [{ value: "matches", label: "Matches" }] : []),
    ...(showStandings ? [{ value: "standings", label: "Standings" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/o/$orgSlug/tournaments"
          params={{ orgSlug }}
          className="hover:text-foreground"
        >
          Tournaments
        </Link>
        <span>/</span>
        <span className="text-foreground">{tournament.name}</span>
      </div>

      <PageHeader
        title={tournament.name}
        description={tournament.description ?? "No description."}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="gap-1 font-mono">
              {isBracket ? (
                <IconBrackets className="size-3" />
              ) : (
                <IconTrophy className="size-3" />
              )}
              {tournament.format}
            </Badge>
            <StatusPill status={tournament.status} />
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) => {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?tab=${next}`,
          );
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
        items={tabs}
      />

      <div className="pt-6">
        {tab === "overview" && (
          <TournamentOverviewPanel
            organizationId={organizationId}
            tournament={tournament}
            onRefresh={() => void refetch()}
          />
        )}

        {tab === "participants" && (
          <TournamentParticipantsPanel
            organizationId={organizationId}
            tournament={tournament}
            onRefresh={() => void refetch()}
          />
        )}

        {tab === "bracket" && isBracket && (
          <TournamentBracketPanel
            organizationId={organizationId}
            tournament={tournament}
          />
        )}

        {tab === "matches" && isBracket && (
          <TournamentMatchesPanel
            organizationId={organizationId}
            tournament={tournament}
          />
        )}

        {tab === "standings" && showStandings && (
          <TournamentStandingsPanel
            organizationId={organizationId}
            tournament={tournament}
          />
        )}
      </div>
    </div>
  );
}
