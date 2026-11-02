import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconKey, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { SecretReveal } from "@/components/primitives/secret-reveal";
import { ROLE_PERMISSIONS } from "@wasanni/contracts";
import {
  DEFAULT_EXPIRY_VALUE,
  EXPIRY_PRESETS,
} from "@/lib/expiry-presets";
import {
  expiryPresetValue,
  secondsForPresetValue,
} from "@/lib/expiry-preset-values";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  platformId: string | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export function PlatformKeysPanel({
  organizationId,
  platformId,
}: {
  organizationId: string;
  platformId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [expiry, setExpiry] = React.useState(DEFAULT_EXPIRY_VALUE);
  const [busy, setBusy] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [revoking, setRevoking] = React.useState<KeyRow | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["keys", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ keys: KeyRow[] }>(
        `/api/v1/organizations/${organizationId}/keys`,
      ).then((response) => response.keys),
  });

  const platformKeys = keys.filter(
    (key) => key.platformId === platformId && key.scope === "platform",
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["keys", organizationId] });

  async function create() {
    setBusy(true);
    try {
      const { apiKey } = await apiFetch<{ apiKey: { key: string } }>(
        `/api/v1/organizations/${organizationId}/keys`,
        {
          method: "POST",
          data: JSON.stringify({
            name,
            scope: "platform",
            platformId,
            permissions: ROLE_PERMISSIONS.owner,
            expiresInSeconds: secondsForPresetValue(expiry) ?? undefined,
          }),
        },
      );

      setRevealedSecret(apiKey.key);
      setAcknowledged(false);
      setName("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  }

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
      {revealedSecret === null ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/50 p-4">
          <div className="min-w-[180px] flex-1 space-y-1.5">
            <Label htmlFor="platform-key-name">Name</Label>
            <Input
              id="platform-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production server"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expires</Label>
            <Select
              value={expiry}
              onValueChange={setExpiry}
              options={EXPIRY_PRESETS.map((preset) => ({
                value: expiryPresetValue(preset),
                label: preset.label,
              }))}
              className="w-40"
            />
          </div>
          <Button size="sm" onClick={create} disabled={busy || !name}>
            {busy ? "Creating…" : "Create key"}
          </Button>
          <p className="w-full text-[11px] text-muted-foreground">
            Scoped to this platform. It can open sessions and record scores here;
            nothing else.
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-border bg-card/50 p-4">
          <SecretReveal
            secret={revealedSecret}
            label="Platform API key"
            onAcknowledge={() => setAcknowledged(true)}
          />
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              disabled={!acknowledged}
              onClick={() => setRevealedSecret(null)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={platformKeys}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconKey className="size-5" />}
            title="No platform keys yet"
            description="Create a key so this platform's server can open sessions and record scores."
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
