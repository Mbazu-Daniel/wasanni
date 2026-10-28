import * as React from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterParticipantModal({
  open,
  onOpenChange,
  organizationId,
  tournamentId,
  platformId,
  platformName,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  tournamentId: string;
  platformId: string;
  platformName: string;
  onRegistered: () => void;
}) {
  const [externalUserId, setExternalUserId] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) return;

    setExternalUserId("");
    setDisplayName("");
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/tournaments/${tournamentId}/participants`,
        {
          method: "POST",
          body: JSON.stringify({
            platformId,
            externalUserId,
            ...(displayName.trim() === "" ? {} : { displayName: displayName.trim() }),
          }),
        },
      );

      toast.success(`Registered ${displayName || externalUserId}`);
      onRegistered();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Register a participant"
      description={`Adds a player from ${platformName} to this tournament.`}
    >
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="reg-external">External user ID</Label>
          <Input
            id="reg-external"
            value={externalUserId}
            onChange={(event) => setExternalUserId(event.target.value)}
            placeholder="u_552"
            required
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            The player&apos;s ID on {platformName}.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-name">Display name (optional)</Label>
          <Input
            id="reg-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Tunde"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !externalUserId}>
            {busy ? "Registering…" : "Register"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
