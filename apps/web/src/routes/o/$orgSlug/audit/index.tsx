import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconBroadcast,
  IconBuilding,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconKey,
  IconList,
  IconRobot,
  IconUser,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { useCursorPage } from "@/lib/use-cursor-page";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";

type AuditSource = "auth" | "organization" | "api" | "worker";
type AuditActorType = "user" | "api_key" | "system";

type AuditRow = {
  id: string;
  organizationId: string | null;
  actorType: AuditActorType;
  actorUserId: string | null;
  actorApiKeyId: string | null;
  source: AuditSource;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditListResponse = {
  data: AuditRow[];
  page: { limit: number; hasMore: boolean; cursor: string | null };
};

const SOURCE_ICONS: Record<AuditSource, React.ComponentType<{ className?: string }>> = {
  auth: IconKey,
  organization: IconBuilding,
  api: IconBroadcast,
  worker: IconRobot,
};

const ACTOR_ICONS: Record<
  AuditActorType,
  React.ComponentType<{ className?: string }>
> = {
  user: IconUser,
  api_key: IconKey,
  system: IconRobot,
};

const ACTION_COLORS: Record<string, string> = {
  created: "text-emerald-300",
  updated: "text-blue-soft",
  deleted: "text-rose-300",
  revoked: "text-rose-300",
  rejected: "text-rose-300",
  failed: "text-rose-300",
  hidden: "text-pink",
};

function colorForAction(action: string): string {
  const suffix = action.split(".").pop() ?? "";
  return ACTION_COLORS[suffix] ?? "text-foreground";
}

function metadataOf(row: AuditRow): Record<string, unknown> | null {
  if (row.metadata === null || typeof row.metadata !== "object") return null;

  const entries = Object.entries(row.metadata as Record<string, unknown>);
  if (entries.length === 0) return null;

  return Object.fromEntries(entries);
}

export const Route = createFileRoute("/o/$orgSlug/audit/")({
  head: () => ({ meta: [{ title: "Audit · Wasanni" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";

  const [source, setSource] = React.useState("");
  const [action, setAction] = React.useState("");
  const [resourceType, setResourceType] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const page = useCursorPage();

  React.useEffect(() => {
    page.reset();
  }, [source, action, resourceType, page.reset]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "audit",
      organizationId,
      { source, action, resourceType, cursor: page.cursor },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (source) params.set("source", source);
      if (action) params.set("action", action);
      if (resourceType) params.set("resourceType", resourceType);
      if (page.cursor) params.set("cursor", page.cursor);
      params.set("limit", "50");

      return apiFetch<AuditListResponse>(
        `/api/v1/organizations/${organizationId}/audit?${params.toString()}`,
      );
    },
    enabled: org !== null,
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (org === null) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit"
        description="Every mutation in this organization, newest first. Open a row for the actor, the address and the metadata."
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Source</label>
          <Select
            value={source}
            onValueChange={setSource}
            options={[
              { value: "", label: "All sources" },
              { value: "auth", label: "Auth" },
              { value: "organization", label: "Organization" },
              { value: "api", label: "API" },
              { value: "worker", label: "Worker" },
            ]}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Action</label>
          <Input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. games.update"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Resource type</label>
          <Input
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
            placeholder="e.g. game, member"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconList className="size-5" />}
          title="No audit events"
          description="Events appear here as soon as you create, update or delete things in this organization."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/40">
              <tr>
                <th className="w-8 px-3 py-2.5" />
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Resource</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expanded.has(row.id);
                const SourceIcon = SOURCE_ICONS[row.source] ?? IconList;
                const ActorIcon = ACTOR_ICONS[row.actorType] ?? IconUser;
                const metadata = metadataOf(row);

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpanded(row.id)}
                      className={cn(
                        "cursor-pointer border-t border-border transition-colors hover:bg-white/[0.02]",
                        isExpanded && "bg-white/[0.02]",
                      )}
                    >
                      <td className="px-3 py-3 align-middle">
                        {isExpanded ? (
                          <IconChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <IconChevronRight className="size-3.5 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(row.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <ActorIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate font-mono text-xs">
                            {row.actorUserId ?? row.actorApiKeyId ?? "system"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={cn(
                            "font-mono text-xs",
                            colorForAction(row.action),
                          )}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {row.resourceType}
                          </span>
                          {row.resourceId !== null && (
                            <span className="truncate font-mono text-[11px] text-muted-foreground/70">
                              {row.resourceId.slice(0, 12)}…
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <SourceIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-xs capitalize">{row.source}</span>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-t border-border bg-[#04050c]">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="grid gap-1.5 sm:grid-cols-3">
                              <Detail
                                label="Timestamp"
                                value={formatDateTime(row.createdAt)}
                              />
                              <Detail label="IP address" value={row.ipAddress ?? "—"} />
                              <Detail
                                label="User agent"
                                value={row.userAgent ?? "—"}
                                small
                              />
                            </div>

                            {metadata !== null && (
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                                  Metadata
                                </p>
                                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-black/20 p-2 font-mono text-[10px] text-muted-foreground">
                                  {JSON.stringify(metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page.pageIndex + 1}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={page.previous}
              disabled={!page.hasPrevious}
            >
              <IconChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.page.hasMore}
              onClick={() => {
                const cursor = data?.page.cursor;
                if (!cursor) return;

                page.next(cursor);
              }}
            >
              Next
              <IconChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </th>
  );
}

function Detail({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 break-all",
          small ? "text-[11px] text-muted-foreground" : "text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}
