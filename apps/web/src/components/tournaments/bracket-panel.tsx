import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BracketMatch, BracketView as BracketData, TournamentRow } from "@/lib/tournament-types";
import { BracketView } from "./bracket-view";
import { CompleteMatchDialog } from "./complete-match-dialog";

export function TournamentBracketPanel({
  organizationId,
  tournament,
}: {
  organizationId: string;
  tournament: TournamentRow;
}) {
  const queryClient = useQueryClient();
  const [completing, setCompleting] = React.useState<BracketMatch | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["tournament-bracket", organizationId, tournament.id],
    queryFn: () =>
      apiFetch<{ bracket: BracketData }>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/bracket`,
      ).then((response) => response.bracket),
    refetchInterval: tournament.status === "running" ? 5000 : false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Bracket</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data ? `${data.bracketSize} participants · ${data.totalRounds} rounds` : "—"}
            {data?.currentRound ? ` · round ${data.currentRound}` : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <IconRefresh className={cn("size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading || data === undefined ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <BracketView
          bracket={data}
          onCompleteMatch={(match) => setCompleting(match)}
        />
      )}

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
