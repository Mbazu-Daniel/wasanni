import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart } from "@/components/usage/daily-chart";
import { apiFetch } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";
import type { AgentSpendView } from "@/lib/agent-types";

export function AgentSpend({
  organizationId,
  days,
}: {
  organizationId: string;
  days: number;
}) {
  const { data, isFetching } = useQuery({
    queryKey: ["agent-spend", organizationId, days],
    queryFn: () =>
      apiFetch<AgentSpendView>(
        `/api/v1/organizations/${organizationId}/agents/spend?days=${days}`,
      ),
  });

  if (data === undefined) {
    return <Skeleton className="h-56 rounded-2xl" />;
  }

  const rows = data.daily.map((day) => ({ date: day.date, value: day.costMicros }));

  return (
    <div className="rounded-2xl border-2 border-launch-ink bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-poster text-lg font-black uppercase tracking-[-0.02em]">
            Model spend
            <span className="text-pink"> · {formatUsd(data.costMicros)}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What the agent cost you in the selected window.
          </p>
        </div>
        {isFetching && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pink">
            Loading
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Runs" value={data.runs.toLocaleString()} />
        <Figure label="Cost" value={formatUsd(data.costMicros)} />
        <Figure
          label="Tokens in"
          value={data.promptTokens.toLocaleString()}
        />
        <Figure
          label="Tokens out"
          value={data.completionTokens.toLocaleString()}
        />
      </div>

      {data.runs === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No runs in this window.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <Chart rows={rows} format={formatUsd} />
          </div>
          <Models models={data.models} />
        </>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-launch-ink/[0.03] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/60">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Models({ models }: { models: AgentSpendView["models"] }) {
  if (models.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-left font-mono text-[11px] uppercase tracking-[0.12em]">
        <thead className="text-launch-ink/55">
          <tr className="border-b border-launch-ink/20">
            <th className="py-2 pr-3 font-normal">Model</th>
            <th className="py-2 pr-3 text-right font-normal">Runs</th>
            <th className="py-2 pr-3 text-right font-normal">In</th>
            <th className="py-2 pr-3 text-right font-normal">Out</th>
            <th className="py-2 pr-3 text-right font-normal">Avg ms</th>
            <th className="py-2 text-right font-normal">Cost</th>
          </tr>
        </thead>
        <tbody className="normal-case tracking-normal">
          {models.map((model) => (
            <tr
              key={model.model}
              className="border-b border-launch-ink/10 last:border-0"
            >
              <td className="max-w-52 truncate py-2 pr-3" title={model.model}>
                {model.model}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {model.runs.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {model.promptTokens.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {model.completionTokens.toLocaleString()}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {Math.round(model.avgDurationMs).toLocaleString()}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatUsd(model.costMicros)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
