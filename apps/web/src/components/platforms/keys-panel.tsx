import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconKey } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { SecretReveal } from "@/components/primitives/secret-reveal";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
};

const SCOPE_GROUPS: { label: string; scopes: { id: string; description: string }[] }[] = [
  {
    label: "Games",
    scopes: [
      { id: "game:read", description: "List games and read their config" },
      { id: "gameFile:read", description: "Download game bundles" },
    ],
  },
  {
    label: "Play",
    scopes: [
      { id: "session:create", description: "Create play sessions" },
      { id: "session:read", description: "Read session details" },
      { id: "session:update", description: "End sessions" },
      { id: "score:create", description: "Submit scores on behalf of the server" },
      { id: "score:read", description: "Read score details and leaderboards" },
      { id: "score:hide", description: "Hide scores for a player" },
    ],
  },
  {
    label: "Competition",
    scopes: [
      { id: "tournament:read", description: "List and read tournaments" },
      { id: "tournament:register", description: "Register players for a tournament" },
      { id: "match:read", description: "Read match details" },
      { id: "match:complete", description: "Declare a match winner" },
    ],
  },
];

const DEFAULT_SCOPES = ["session:create", "session:read", "score:create", "score:read"];

export function PlatformKeysPanel({
  organizationId,
  platformId,
}: {
  organizationId: string;
  platformId: string;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [revoking, setRevoking] = React.useState<KeyRow | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["keys", organizationId, platformId],
    queryFn: () =>
      apiFetch<{ keys: KeyRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/keys`,
      ).then((response) => response.keys),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["keys", organizationId, platformId] });

  async function revoke() {
    if (revoking === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/keys/${revoking.id}`,
        { method: "PATCH", body: JSON.stringify({ enabled: false }) },
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
      render: (key) =>
        key.enabled ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-300"
            onClick={() => setRevoking(key)}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">API keys</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scoped keys for this platform&apos;s server.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-3.5" />
          Create key
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={keys}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconKey className="size-5" />}
            title="No API keys yet"
            description="Create a key to let this platform's server create sessions and submit scores."
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
        platformId={platformId}
        onCreated={(secret) => {
          setRevealedSecret(secret);
          refresh();
        }}
        revealedSecret={revealedSecret}
        onAcknowledged={() => setAcknowledged(true)}
        acknowledged={acknowledged}
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

function CreateKeyModal({
  open,
  onOpenChange,
  organizationId,
  platformId,
  onCreated,
  revealedSecret,
  onAcknowledged,
  acknowledged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  platformId: string;
  onCreated: (secret: string) => void;
  revealedSecret: string | null;
  onAcknowledged: () => void;
  acknowledged: boolean;
}) {
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<Set<string>>(new Set(DEFAULT_SCOPES));
  const [expiresInDays, setExpiresInDays] = React.useState<number | "">(90);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) return;
    setName("");
    setScopes(new Set(DEFAULT_SCOPES));
    setExpiresInDays(90);
  }, [open]);

  function toggleScope(id: string) {
    setScopes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (scopes.size === 0) {
      toast.error("Pick at least one scope");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, string[]> = {};

      for (const scope of scopes) {
        const [resource, action] = scope.split(":") as [string, string];
        (payload[resource] ??= []).push(action);
      }

      const { apiKey } = await apiFetch<{ apiKey: { key: string } }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/keys`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            permissions: payload,
            expiresInSeconds:
              expiresInDays === "" ? undefined : Number(expiresInDays) * 86_400,
          }),
        },
      );

      onCreated(apiKey.key);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={revealedSecret === null ? "Create an API key" : "Save your API key"}
      description={
        revealedSecret === null
          ? "The key is shown once. Give it only the scopes the server needs."
          : undefined
      }
      className="w-[min(92vw,560px)]"
    >
      {revealedSecret === null ? (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="max-h-[260px] space-y-4 overflow-y-auto rounded-lg border border-border p-3">
              {SCOPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.scopes.map((scope) => (
                      <label
                        key={scope.id}
                        className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 hover:bg-white/[0.03]"
                      >
                        <input
                          type="checkbox"
                          checked={scopes.has(scope.id)}
                          onChange={() => toggleScope(scope.id)}
                          className="mt-0.5 size-3.5 rounded border-border"
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs">{scope.id}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {scope.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expires">Expires in</Label>
            <div className="flex items-center gap-2">
              <Input
                id="expires"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(event) => {
                  const value = event.target.value;
                  setExpiresInDays(value === "" ? "" : Number(value));
                }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !name}>
              {busy ? "Creating…" : "Create key"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <SecretReveal
            secret={revealedSecret}
            label="API key"
            onAcknowledge={onAcknowledged}
          />
          <div className="mt-6 flex justify-end">
            <Button size="sm" disabled={!acknowledged} onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
