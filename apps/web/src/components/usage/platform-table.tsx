import { Link } from "@tanstack/react-router";
import { formatBytes } from "@/lib/format";
import type { PlatformView } from "@/lib/platform-types";

export function PlatformUsage({
  perPlatform,
  platforms,
  orgSlug,
}: {
  perPlatform: Map<string, Record<string, number>>;
  platforms: PlatformView[];
  orgSlug: string;
}) {
  const platformById = new Map(platforms.map((platform) => [platform.id, platform]));

  return (
    <div>
      <h2 className="text-sm font-semibold">Per platform</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Session, score, match, and tournament counts per platform this month.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/40">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Platform
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Sessions
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Scores
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Matches
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Tournaments
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Bandwidth
              </th>
            </tr>
          </thead>
          <tbody>
            {perPlatform.size === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No platform activity this month.
                  </p>
                </td>
              </tr>
            ) : (
              [...perPlatform.entries()].map(([platformId, counts]) => {
                const platform = platformById.get(platformId);

                return (
                  <tr
                    key={platformId}
                    className="border-t border-border transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 align-middle">
                      {platform === undefined ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {platformId}
                        </span>
                      ) : (
                        <Link
                          to="/o/$orgSlug/platforms/$platformSlug"
                          params={{ orgSlug, platformSlug: platform.slug }}
                          search={{ tab: "overview" }}
                          className="text-sm font-medium hover:text-blue-soft"
                        >
                          {platform.name}
                        </Link>
                      )}
                    </td>
                    <Count value={counts.sessions_created ?? 0} />
                    <Count value={counts.scores_submitted ?? 0} />
                    <Count value={counts.matches_created ?? 0} />
                    <Count value={counts.tournaments_created ?? 0} />
                    <td className="px-4 py-3 text-right align-middle">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatBytes(counts.bandwidth_bytes ?? 0)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return (
    <td className="px-4 py-3 text-right align-middle font-mono text-xs tabular-nums">
      {value.toLocaleString()}
    </td>
  );
}
