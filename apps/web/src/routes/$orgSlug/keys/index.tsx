import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconKey, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { CreateKeyModal } from "@/components/platforms/keys-panel";
import type { PlatformSummary } from "@/components/platforms/platform-choice";
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

export const Route = createFileRoute("/$orgSlug/keys/")({
  head: () => ({ meta: [{ title: "API keys · Wasanni" }] }),
  component: OrgKeysPage,
});

function OrgKeysPage() {
  const { org } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformSummary[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
    enabled: org !== null,
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["keys", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ keys: OrgKeyRow[] }>(
        `/api/v1/organizations/${organizationId}/keys`,
      ).then((response) => response.keys),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["keys", organizationId] });

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
            to="/$orgSlug/platforms/$platformSlug"
            params={{ orgSlug: orgSlug, platformSlug: row.platformSlug }}
            search={{ tab: "keys" }}
            className="text-sm text-blue hover:underline"
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
        actions={
          platforms.length > 0 ? (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-3.5" />
              Create key
            </Button>
          ) : null
        }
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
            description={
              platforms.length === 0
                ? "A key belongs to one platform, so create a platform first."
                : "Create a key for one of your platforms to let its server call the API."
            }
          />
        }
      />

      <CreateKeyModal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && revealedSecret !== null && !acknowledged) {
            toast.error("Save the secret first");
            return;
          }
          setCreateOpen(open);
          if (!open) {
            setRevealedSecret(null);
            setAcknowledged(false);
          }
        }}
        organizationId={organizationId}
        target={{ kind: "pick", platforms }}
        onCreated={(secret) => {
          setRevealedSecret(secret);
          refresh();
        }}
        revealedSecret={revealedSecret}
        onAcknowledged={() => setAcknowledged(true)}
        acknowledged={acknowledged}
      />
    </div>
  );
}
