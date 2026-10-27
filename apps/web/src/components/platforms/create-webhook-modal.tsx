import * as React from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SecretReveal } from "@/components/primitives/secret-reveal";

const EVENTS: string[] = [
  "score.submitted",
  "score.hidden",
  "score.rejected",
  "session.created",
  "session.ended",
  "webhook.test",
];


export function CreateWebhookModal({
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
