import * as React from "react";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UsageMetric, UsageQuotaView } from "@/lib/usage-types";

const QUOTAS: {
  metric: UsageMetric;
  label: string;
  format: (value: number) => string;
}[] = [
  {
    metric: "sessions_created",
    label: "Sessions / month",
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "scores_submitted",
    label: "Scores / month",
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "matches_created",
    label: "Matches / month",
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "tournaments_created",
    label: "Tournaments / month",
    format: (value) => value.toLocaleString(),
  },
  {
    metric: "bandwidth_bytes",
    label: "Bandwidth / month",
    format: formatBytes,
  },
];

export function QuotaEditor({
  organizationId,
  quotas,
  current,
  onChanged,
}: {
  organizationId: string;
  quotas: UsageQuotaView[];
  current: Record<string, number>;
  onChanged: () => void;
}) {
  const quotaByMetric = new Map(quotas.map((quota) => [quota.metric, quota]));

  return (
    <div>
      <h2 className="text-sm font-semibold">Quotas</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Set a monthly cap for a metric. Once a quota is reached, the platform is
        blocked from creating more of that resource until next month.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/40">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Metric
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                This month
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Quota
              </th>
              <th className="w-32 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {QUOTAS.map((quota) => (
              <Row
                key={quota.metric}
                organizationId={organizationId}
                metric={quota.metric}
                label={quota.label}
                current={current[quota.metric] ?? 0}
                format={quota.format}
                limit={quotaByMetric.get(quota.metric)?.limitValue}
                onChanged={onChanged}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  organizationId,
  metric,
  label,
  current,
  format,
  limit,
  onChanged,
}: {
  organizationId: string;
  metric: UsageMetric;
  label: string;
  current: number;
  format: (value: number) => string;
  limit?: number;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(limit === undefined ? "" : String(limit));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setValue(limit === undefined ? "" : String(limit));
  }, [limit]);

  const overLimit = limit !== undefined && limit > 0 && current >= limit;

  async function save() {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error("Enter a valid number");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/quotas`, {
        method: "PUT",
        body: JSON.stringify({ metric, limitValue: numeric }),
      });
      toast.success("Quota saved");
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/quotas/${metric}`, {
        method: "DELETE",
      });
      toast.success("Quota removed");
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          {overLimit && <IconAlertTriangle className="size-3.5 text-rose-300" />}
        </div>
      </td>
      <td className="px-4 py-3 text-right align-middle font-mono text-xs tabular-nums">
        {format(current)}
      </td>
      <td className="px-4 py-3 align-middle">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={save} disabled={busy} className="h-7">
              <IconCheck className="size-3" />
            </Button>
          </div>
        ) : limit === undefined ? (
          <span className="text-xs text-muted-foreground">no limit</span>
        ) : (
          <span className="font-mono text-xs">{format(limit)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right align-middle">
        {editing ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setValue(limit === undefined ? "" : String(limit));
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            {limit !== undefined && (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-300"
                onClick={remove}
                disabled={busy}
              >
                Remove
              </Button>
            )}
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {limit === undefined ? "Set quota" : "Edit"}
          </Button>
        )}
      </td>
    </tr>
  );
}
