import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconKey } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { Badge } from "@/components/ui/badge";

type OrgKeyRow = {
  id: string;
  platformId: string;
  platformName: string | null;
  platformSlug: string | null;
  name: string;
  prefix: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export const Route = createFileRoute("/o/$orgSlug/keys/")({
  head: () => ({ meta: [{ title: "API keys · Wasanni" }] }),
  component: OrgKeysPage,
});

function OrgKeysPage() {
  const { org } = Route.useRouteContext();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["keys", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ keys: OrgKeyRow[] }>(
        `/api/v1/organizations/${organizationId}/keys`,
      ).then((response) => response.keys),
  });

  const columns: DataTableColumn<OrgKeyRow>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {row.prefix}…
          </p>
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
            search={{ tab: "keys" }}
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
          <Badge variant="success">active</Badge>
        ) : (
          <Badge variant="muted">revoked</Badge>
        ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      sortValue: (row) => row.expiresAt ?? "",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.expiresAt === null
            ? "Never"
            : new Date(row.expiresAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="API keys"
        description="Every key across every platform in this organization."
      />

      <DataTable
        columns={columns}
        data={keys}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconKey className="size-5" />}
            title="No API keys yet"
            description="Create one from a platform's Keys tab."
          />
        }
      />
    </div>
  );
}
