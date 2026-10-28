import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconKey,
  IconList,
  IconRobot,
  IconUser,
} from "@tabler/icons-react";
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  AUDIT_SOURCES,
  type AuditActorType,
  type AuditResourceType,
  type AuditSource,
} from "@wasanni/contracts";
import { apiFetch } from "@/lib/api-client";
import { useCursorPage } from "@/lib/use-cursor-page";
import { formatDateTime } from "@/lib/format";
import type { MemberRow } from "@/lib/member-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SelectOption } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { EmptyState } from "@/components/primitives/empty-state";

type AuditRow = {
  id: string;
  organizationId: string | null;
  actorType: AuditActorType;
  actorUserId: string | null;
  actorApiKeyId: string | null;
  actorName: string | null;
  actorAvatar: string | null;
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
  updated: "text-blue",
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

const titleOf = (value: string): string =>
  value.split("_").join(" ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const RESOURCE_OPTIONS = [
  { value: "", label: "All resources" },
  ...AUDIT_RESOURCE_TYPES.map((type) => ({ value: type, label: titleOf(type) })),
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  ...AUDIT_SOURCES.map((source) => ({ value: source, label: titleOf(source) })),
];

const TIME_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const actionOptionsFor = (resourceType: string): SelectOption[] => [
  { value: "", label: "All actions" },
  ...(resourceType === "" ? AUDIT_RESOURCE_TYPES : [resourceType as AuditResourceType])
    .flatMap((type) =>
      AUDIT_ACTIONS[type].map((verb) => ({
        value: `${type}.${verb}`,
        label: `${titleOf(type)} ${titleOf(verb)}`,
      })),
    ),
];

const actionLabelOf = (action: string): string => action.split(".").map(titleOf).join(" ");

const resourceLabelOf = (resourceType: string): string => titleOf(resourceType);

const timeBoundsOf = (value: string): { from?: string; to?: string } => {
  if (value === "") return {};
  const hours = value === "24h" ? 24 : value === "7d" ? 168 : value === "30d" ? 720 : 2160;
  const now = new Date();
  return { from: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
};

function metadataOf(row: AuditRow): Record<string, unknown> | null {
  if (row.metadata === null || typeof row.metadata !== "object") return null;

  const entries = Object.entries(row.metadata as Record<string, unknown>);
  if (entries.length === 0) return null;

  return Object.fromEntries(entries);
}

export const Route = createFileRoute("/$orgSlug/audit/")({
  head: () => ({ meta: [{ title: "Audit · Wasanni" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";

  const [actor, setActor] = React.useState("");
  const [action, setAction] = React.useState("");
  const [resourceType, setResourceType] = React.useState("");
  const [source, setSource] = React.useState("");
  const [timeRange, setTimeRange] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const page = useCursorPage();

  React.useEffect(() => {
    page.reset();
  }, [actor, action, resourceType, source, timeRange, page.reset]);

  React.useEffect(() => {
    if (resourceType !== "" && action !== "" && !action.startsWith(`${resourceType}.`)) {
      setAction("");
    }
  }, [resourceType, action]);

  const { data: members = [] } = useQuery({
    queryKey: ["members", organizationId],
    queryFn: () =>
      apiFetch<{ members: MemberRow[] }>(
        `/api/v1/organizations/${organizationId}/members`,
      ).then((response) => response.members),
    enabled: org !== null,
  });

  const actorOptions: SelectOption[] = [
    { value: "", label: "All actors" },
    ...members.map((member) => ({ value: member.userId, label: member.name })),
  ];

  const { data, isLoading } = useQuery({
    queryKey: [
      "audit",
      organizationId,
      { actor, action, resourceType, source, timeRange, cursor: page.cursor },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (actor) params.set("actorUserId", actor);
      if (action) params.set("action", action);
      if (resourceType) params.set("resourceType", resourceType);
      if (source) params.set("source", source);
      const bounds = timeBoundsOf(timeRange);
      if (bounds.from !== undefined) params.set("from", bounds.from);
      if (bounds.to !== undefined) params.set("to", bounds.to);
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
  const filtering =
    actor !== "" ||
    action !== "" ||
    resourceType !== "" ||
    source !== "" ||
    timeRange !== "";

  return (
    <div>
      <PageHeader
        title="Audit"
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Actor</label>
          <SearchableSelect
            value={actor}
            onValueChange={setActor}
            options={actorOptions}
            placeholder="All actors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Action</label>
          <SearchableSelect
            value={action}
            onValueChange={setAction}
            options={actionOptionsFor(resourceType)}
            placeholder="All actions"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Resource type</label>
          <SearchableSelect
            value={resourceType}
            onValueChange={setResourceType}
            options={RESOURCE_OPTIONS}
            placeholder="All resources"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Source</label>
          <SearchableSelect
            value={source}
            onValueChange={setSource}
            options={SOURCE_OPTIONS}
            placeholder="All sources"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Time range</label>
          <SearchableSelect
            value={timeRange}
            onValueChange={setTimeRange}
            options={TIME_OPTIONS}
            placeholder="Any time"
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
          description={
            filtering
              ? "No events match the filters you picked."
              : "Events appear here as soon as you create, update or delete things in this organization."
          }
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expanded.has(row.id);
                const ActorIcon = ACTOR_ICONS[row.actorType] ?? IconUser;
                const metadata = metadataOf(row);
                const actorName = row.actorName ?? (row.actorType === "api_key" ? "API key" : "System");

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpanded(row.id)}
                      className={cn(
                        "cursor-pointer border-t border-border transition-colors hover:bg-ink/[0.04]",
                        isExpanded && "bg-ink/[0.04]",
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
                          {row.actorAvatar !== null ? (
                            <img src={row.actorAvatar} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[0.08]">
                              <ActorIcon className="size-3.5 text-muted-foreground" />
                            </span>
                          )}
                          <span className="truncate text-xs font-medium">{actorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={cn(
                            "font-mono text-xs",
                            colorForAction(row.action),
                          )}
                        >
                          {actionLabelOf(row.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {resourceLabelOf(row.resourceType)}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-t border-border bg-[#04050c]">
                        <td colSpan={5} className="px-4 py-3">
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
                                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-ink/20 p-2 font-mono text-[10px] text-muted-foreground">
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
