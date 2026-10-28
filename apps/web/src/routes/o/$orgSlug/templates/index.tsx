import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconLayout,
  IconPlus,
  IconLayoutGrid,
  IconTrophy,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";
import { StatusPill } from "@/components/primitives/status-pill";
import { Skeleton } from "@/components/ui/skeleton";

type TemplateRow = {
  id: string;
  kind: "game" | "tournament";
  name: string;
  slug: string;
  description: string | null;
  status: "pending_upload" | "ready" | "failed";
  sizeBytes: number | null;
  createdAt: string;
};

const KIND_ICONS = {
  game: IconLayoutGrid,
  tournament: IconTrophy,
};

const KIND_LABELS = {
  game: "Game page",
  tournament: "Tournament page",
};

export const Route = createFileRoute("/o/$orgSlug/templates/")({
  head: () => ({ meta: [{ title: "Templates · Wasanni" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [kindFilter, setKindFilter] = React.useState<
    "all" | "game" | "tournament"
  >("all");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", organizationId],
    queryFn: () =>
      apiFetch<{ templates: TemplateRow[] }>(
        `/api/v1/organizations/${organizationId}/templates`,
      ).then((response) => response.templates),
  });

  const filtered =
    kindFilter === "all"
      ? templates
      : templates.filter((template) => template.kind === kindFilter);

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Page layouts that wrap a game or a tournament. Uploaded as a zip and served from R2."
        actions={
          <Link to="/o/$orgSlug/templates/new" params={{ orgSlug }}>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="size-3.5" />
              New template
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex rounded-lg border border-border p-0.5 text-xs">
        {(["all", "game", "tournament"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setKindFilter(option)}
            className={
              kindFilter === option
                ? "flex-1 rounded bg-white/[0.06] px-2.5 py-1.5 capitalize text-foreground"
                : "flex-1 rounded px-2.5 py-1.5 capitalize text-muted-foreground hover:text-foreground"
            }
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<IconLayout className="size-5" />}
          title="No templates yet"
          description="A template wraps a game or tournament page in your own HTML and CSS. Upload one to give hosted games a custom look."
          primary={
            <Link to="/o/$orgSlug/templates/new" params={{ orgSlug }}>
              <Button className="gap-1.5">
                <IconPlus className="size-3.5" />
                Create template
              </Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No templates match this filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((template) => {
            const Icon = KIND_ICONS[template.kind];

            return (
              <Link
                key={template.id}
                to="/o/$orgSlug/templates/$templateId"
                params={{ orgSlug, templateId: template.id }}
                className="group flex flex-col rounded-xl border border-border bg-card/50 p-4 transition-colors hover:border-pink/30 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 text-blue-soft" />
                    <h3 className="truncate text-sm font-semibold">
                      {template.name}
                    </h3>
                  </div>
                  <StatusPill status={template.status} />
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {template.slug}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {KIND_LABELS[template.kind]}
                </p>
                {template.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
