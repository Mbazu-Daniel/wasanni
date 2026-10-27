import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconWebhook } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { Badge } from "@/components/ui/badge";

type OrgWebhookRow = {
  id: string;
  platformId: string;
  platformName: string | null;
  platformSlug: string | null;
  url: string;
  description: string | null;
  events: string[];
  enabled: boolean;
  lastDeliveryAt: string | null;
  lastFailureAt: string | null;
};

export const Route = createFileRoute("/o/$orgSlug/webhooks/")({
  head: () => ({ meta: [{ title: "Webhooks · Wasanni" }] }),
  component: OrgWebhooksPage,
});

function OrgWebhooksPage() {
  const { org } = Route.useRouteContext();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ webhooks: OrgWebhookRow[] }>(
        `/api/v1/organizations/${organizationId}/webhooks`,
      ).then((response) => response.webhooks),
  });

  const columns: DataTableColumn<OrgWebhookRow>[] = [
    {
      key: "url",
      header: "Endpoint",
      sortValue: (row) => row.url,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{row.url}</p>
          {row.description && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "platformSlug",
      header: "Platform",
      sortValue: (row) => row.platformSlug ?? "",
      render: (row) =>
        row.platformSlug === null ? (
          <span className="text-xs text-muted-foreground">unknown</span>
        ) : (
          <Link
            to="/o/$orgSlug/platforms/$platformSlug"
            params={{ orgSlug: orgSlug, platformSlug: row.platformSlug }}
            search={{ tab: "webhooks" }}
            className="text-sm text-blue-soft hover:underline"
          >
            {row.platformName ?? row.platformSlug}
          </Link>
        ),
    },
    {
      key: "enabled",
      header: "Status",
      sortValue: (row) => (row.enabled ? 1 : 0),
      render: (row) =>
        row.enabled ? (
          <Badge variant="success">enabled</Badge>
        ) : (
          <Badge variant="muted">disabled</Badge>
        ),
    },
    {
      key: "lastDeliveryAt",
      header: "Last delivery",
      sortValue: (row) => row.lastDeliveryAt ?? "",
      render: (row) => {
        const value = row.lastDeliveryAt ?? row.lastFailureAt;

        if (value === null) {
          return <span className="text-xs text-muted-foreground">Never</span>;
        }

        const failed = row.lastDeliveryAt === null;

        return (
          <span
            className={
              failed ? "text-xs text-rose-300" : "text-xs text-muted-foreground"
            }
          >
            {new Date(value).toLocaleString()}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Every webhook across every platform in this organization."
      />

      <DataTable
        columns={columns}
        data={webhooks}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconWebhook className="size-5" />}
            title="No webhooks yet"
            description="Add one from a platform's Webhooks tab."
          />
        }
      />
    </div>
  );
}
