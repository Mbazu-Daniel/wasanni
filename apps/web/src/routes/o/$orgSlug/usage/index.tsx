import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { DailyActivity, type DailyMetric } from "@/components/usage/daily-chart";
import { UsageMetrics } from "@/components/usage/metrics-panel";
import { PlatformUsage } from "@/components/usage/platform-table";
import { QuotaEditor } from "@/components/usage/quotas-panel";
import { StorageBreakdown } from "@/components/usage/storage-panel";
import type { PlatformView } from "@/lib/platform-types";
import type {
  UsageDailyView,
  UsageQuotaView,
  UsageStorageView,
  UsageView,
} from "@/lib/usage-types";

export const Route = createFileRoute("/o/$orgSlug/usage/")({
  head: () => ({ meta: [{ title: "Usage · Wasanni" }] }),
  component: UsagePage,
});

function UsagePage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const queryClient = useQueryClient();

  const [monthOffset, setMonthOffset] = React.useState(0);
  const [dailyMetric, setDailyMetric] = React.useState<DailyMetric>(
    "sessions_created",
  );

  const period = React.useMemo(() => {
    const now = new Date();
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
    );

    return {
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  }, [monthOffset]);

  const dailyRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86_400_000);
    return { start, end };
  }, []);

  const { data: usage, isLoading } = useQuery({
    queryKey: ["usage", organizationId, period.key],
    queryFn: () =>
      apiFetch<UsageView>(
        `/api/v1/organizations/${organizationId}/usage?period=${period.key}`,
      ),
  });

  const { data: daily } = useQuery({
    queryKey: ["usage-daily", organizationId, dailyMetric],
    queryFn: () =>
      apiFetch<UsageDailyView>(
        `/api/v1/organizations/${organizationId}/usage/daily?metric=${dailyMetric}&from=${dailyRange.start.toISOString()}&to=${dailyRange.end.toISOString()}`,
      ),
  });

  const { data: storage } = useQuery({
    queryKey: ["usage-storage", organizationId],
    queryFn: () =>
      apiFetch<UsageStorageView>(
        `/api/v1/organizations/${organizationId}/usage/storage`,
      ),
  });

  const { data: quotas = [] } = useQuery({
    queryKey: ["quotas", organizationId],
    queryFn: () =>
      apiFetch<{ quotas: UsageQuotaView[] }>(
        `/api/v1/organizations/${organizationId}/quotas`,
      ).then((response) => response.quotas),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformView[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
  });

  const totals: Record<string, number> = {};
  const perPlatform = new Map<string, Record<string, number>>();

  for (const counter of usage?.counters ?? []) {
    if (counter.platformId === null) continue;

    totals[counter.metric] = (totals[counter.metric] ?? 0) + counter.value;

    const counts = perPlatform.get(counter.platformId) ?? {};
    counts[counter.metric] = (counts[counter.metric] ?? 0) + counter.value;
    perPlatform.set(counter.platformId, counts);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="How much this organization is using across sessions, scores, storage, and bandwidth."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonthOffset((value) => value - 1)}
              aria-label="Previous month"
            >
              <IconChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-medium">
              {period.label}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonthOffset((value) => Math.min(value + 1, 0))}
              disabled={monthOffset === 0}
              aria-label="Next month"
            >
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <UsageMetrics totals={totals} quotas={quotas} />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <DailyActivity
              rows={daily?.rows}
              metric={dailyMetric}
              onMetricChange={setDailyMetric}
              loading={daily === undefined}
            />

            <StorageBreakdown storage={storage} />
          </div>

          <PlatformUsage
            perPlatform={perPlatform}
            platforms={platforms}
            orgSlug={orgSlug}
          />

          <QuotaEditor
            organizationId={organizationId}
            quotas={quotas}
            current={totals}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ["quotas", organizationId] })
            }
          />
        </>
      )}
    </div>
  );
}
