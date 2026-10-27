import { createFileRoute } from "@tanstack/react-router";
import {
  IconSparkles,
  IconPlayerPlay,
  IconDeviceGamepad2,
  IconArrowRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";

export const Route = createFileRoute("/o/$orgSlug/overview")({
  head: () => ({ meta: [{ title: "Overview · Wasanni" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { org } = Route.useRouteContext();

  return (
    <div>
      <PageHeader
        title={org?.name ?? "Overview"}
        description="What's happening in your workspace right now."
        actions={
          <Button size="sm" className="gap-1.5">
            <IconPlayerPlay className="size-3.5" />
            New session
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Sessions today", value: "0" },
          { label: "Active now", value: "0" },
          { label: "Scores today", value: "0" },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border bg-card/50 p-5"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <EmptyState
          icon={<IconDeviceGamepad2 className="size-5" />}
          title="Add your first game"
          description="Games are the nouns that everything else hangs from. Sessions, scores, tournaments, and matches all live under a game."
          primary={
            <Button className="gap-1.5">
              Create game
              <IconArrowRight className="size-3.5" />
            </Button>
          }
          secondary={
            <Button variant="outline" className="gap-1.5">
              <IconSparkles className="size-3.5" />
              See what's possible
            </Button>
          }
        />
      </div>
    </div>
  );
}
