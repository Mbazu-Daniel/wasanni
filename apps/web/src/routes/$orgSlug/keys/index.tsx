import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconKey, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

type KeyRow = {
  id: string;
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

  const [revoking, setRevoking] = React.useState<KeyRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["keys", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ keys: KeyRow[] }>(
        `/api/v1/organizations/${organizationId}/keys`,
      ).then((response) => response.keys),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["keys", organizationId] });

  async function revoke() {
    if (revoking === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/keys/${revoking.id}`,
        { method: "PATCH", data: JSON.stringify({ enabled: false }) },
      );
      toast.success("API key revoked");
      setRevoking(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke");
    } finally {
      setBusy(false);
    }
  }

  const columns: DataTableColumn<KeyRow>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (row) => row.name,
      render: (key) => (
        <div className="flex items-center gap-2.5">
          <IconKey className="size-3.5 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{key.name}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {key.prefix}…
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Status",
      sortValue: (row) => (row.enabled ? 1 : 0),
      render: (key) =>
        key.enabled ? (
          <Badge variant="success">active</Badge>
        ) : (
          <Badge variant="muted">revoked</Badge>
        ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      sortValue: (row) => row.expiresAt ?? "",
      render: (key) => (
        <span className="text-xs text-muted-foreground">
          {key.expiresAt === null
            ? "Never"
            : new Date(key.expiresAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (key) =>
        key.enabled ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Revoke key"
            title="Revoke key"
            className="text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
            onClick={() => setRevoking(key)}
          >
            <IconTrash className="size-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="API keys"
        actions={
          <Link to="/$orgSlug/keys/new" params={{ orgSlug: org?.slug ?? "" }}>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="size-3.5" />
              Create key
            </Button>
          </Link>
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
            description="Create a key so your servers and MCP clients can call the API."
          />
        }
      />

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke ${revoking?.name ?? "this key"}?`}
        description="Any client using this key stops working immediately. This cannot be undone."
        confirmPhrase={revoking?.name}
        confirmLabel="Revoke key"
        destructive
        busy={busy}
        onConfirm={revoke}
      />
    </div>
  );
}
