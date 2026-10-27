import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconPlus,
  IconWebhook,
  IconRotate,
  IconSend,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { SecretReveal } from "@/components/primitives/secret-reveal";
import { WebhookDeliveriesDrawer } from "./webhook-deliveries-drawer";

const EVENTS = [
  "score.submitted",
  "score.hidden",
  "score.rejected",
  "session.created",
  "session.ended",
  "webhook.test",
];

type WebhookRow = {
  id: string;
  url: string;
  description: string | null;
  secretLast4: string;
  events: string[];
  enabled: boolean;
  lastDeliveryAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
};

export function PlatformWebhooksPanel({
  organizationId,
  platformId,
}: {
  organizationId: string;
  platformId: string;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [deleting, setDeleting] = React.useState<WebhookRow | null>(null);
  const [viewingDeliveries, setViewingDeliveries] = React.useState<WebhookRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", organizationId, platformId],
    queryFn: () =>
      apiFetch<{ webhooks: WebhookRow[] }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks`,
      ).then((response) => response.webhooks),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["webhooks", organizationId, platformId] });

  async function rotateSecret(row: WebhookRow) {
    try {
      const { secret } = await apiFetch<{ secret: string }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks/${row.id}/rotate-secret`,
        { method: "POST" },
      );
      setRevealedSecret(secret);
      setAcknowledged(false);
      setCreateOpen(true);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rotate");
    }
  }

  async function sendTest(row: WebhookRow) {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks/${row.id}/test`,
        { method: "POST" },
      );
      toast.success("Test delivery queued");
      setTimeout(refresh, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not test");
    }
  }

  async function remove() {
    if (deleting === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks/${deleting.id}`,
        { method: "DELETE" },
      );
      toast.success("Webhook deleted");
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(row: WebhookRow, enabled: boolean) {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks/${row.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }

  const columns: DataTableColumn<WebhookRow>[] = [
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
      key: "events",
      header: "Events",
      sortValue: (row) => row.events.length,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.events.slice(0, 2).map((event) => (
            <Badge key={event} variant="muted" className="font-mono text-[10px]">
              {event}
            </Badge>
          ))}
          {row.events.length > 2 && (
            <Badge variant="muted" className="text-[10px]">
              +{row.events.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      sortValue: (row) => (row.enabled ? 1 : 0),
      render: (row) => (
        <Switch
          checked={row.enabled}
          onCheckedChange={(checked) => void toggleEnabled(row, checked)}
        />
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
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewingDeliveries(row)}
            aria-label="Deliveries"
          >
            <IconHistory className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void sendTest(row)}
            aria-label="Send test"
          >
            <IconSend className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void rotateSecret(row)}
            aria-label="Rotate secret"
          >
            <IconRotate className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(row)}
            aria-label="Delete"
          >
            <IconTrash className="size-3.5 text-rose-300" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Webhooks</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every delivery is HMAC-signed. Each event carries an ID for dedup.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-3.5" />
          Add webhook
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={webhooks}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconWebhook className="size-5" />}
            title="No webhooks yet"
            description="Add an endpoint to receive events when scores are submitted or sessions change."
          />
        }
      />

      <CreateWebhookModal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && revealedSecret !== null && !acknowledged) {
            toast.error("Save the signing secret first");
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
          setAcknowledged(false);
          refresh();
        }}
        revealedSecret={revealedSecret}
        onAcknowledged={() => setAcknowledged(true)}
        acknowledged={acknowledged}
      />

      <WebhookDeliveriesDrawer
        organizationId={organizationId}
        webhook={viewingDeliveries}
        onClose={() => setViewingDeliveries(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this webhook?"
        description="Wasanni stops delivering events to this endpoint. This cannot be undone."
        confirmLabel="Delete webhook"
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

function CreateWebhookModal({
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
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [events, setEvents] = React.useState<Set<string>>(new Set(["score.submitted"]));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) return;
    setUrl("");
    setDescription("");
    setEvents(new Set(["score.submitted"]));
  }, [open]);

  function toggleEvent(id: string) {
    setEvents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (events.size === 0) {
      toast.error("Pick at least one event");
      return;
    }

    setBusy(true);
    try {
      const { secret } = await apiFetch<{ secret: string }>(
        `/api/v1/organizations/${organizationId}/platforms/${platformId}/webhooks`,
        {
          method: "POST",
          body: JSON.stringify({
            url,
            description: description || undefined,
            events: Array.from(events),
          }),
        },
      );

      onCreated(secret);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create webhook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={revealedSecret === null ? "Add a webhook" : "Save your signing secret"}
      description={
        revealedSecret === null
          ? "Every delivery is HMAC-signed. Pick the events this endpoint cares about."
          : undefined
      }
      className="w-[min(92vw,560px)]"
    >
      {revealedSecret === null ? (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://arcadehub.example/hooks"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="webhook-description">Description</Label>
            <Textarea
              id="webhook-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Production webhook for ArcadeHub."
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Events</Label>
            <div className="grid max-h-[220px] grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border p-3">
              {EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={events.has(event)}
                    onChange={() => toggleEvent(event)}
                    className="size-3.5 rounded border-border"
                  />
                  <span className="font-mono text-[11px]">{event}</span>
                </label>
              ))}
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
            <Button type="submit" size="sm" disabled={busy || !url}>
              {busy ? "Creating…" : "Create webhook"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <SecretReveal
            secret={revealedSecret}
            label="Signing secret"
            warning="Every delivery is HMAC-signed with this secret. Verify the signature on your server. Store it before closing."
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
