import { useQuery } from "@tanstack/react-query";
import { IconTrophy, IconFlag } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Standings, TournamentRow } from "@/lib/tournament-types";

export function TournamentStandingsPanel({
  organizationId,
  tournament,
}: {
  organizationId: string;
  tournament: TournamentRow;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["tournament-standings", organizationId, tournament.id],
    queryFn: () =>
      apiFetch<Standings>(
        `/api/v1/organizations/${organizationId}/tournaments/${tournament.id}/standings`,
      ),
    refetchInterval: tournament.status === "open" ? 10_000 : false,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (data === undefined || data.format !== "leaderboard" || data.rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <IconTrophy className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No standings yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Register players and start sessions with this tournament to see
          standings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Standings</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ranked by best score per player. Flagged scores still rank and carry
          their reasons.
        </p>
      </div>

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
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Seed
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
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.participantId}
                className="border-t border-border transition-colors hover:bg-ink/[0.04]"
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
                <td className="px-4 py-3 align-middle">
                  {row.seed === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.seed}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right align-middle">
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {row.score ?? "—"}
                  </span>
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
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <Badge variant="muted" className="text-[10px] capitalize">
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
