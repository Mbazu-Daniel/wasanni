import * as React from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { BracketMatch } from "@/lib/tournament-types";

export function CompleteMatchDialog({
  open,
  onOpenChange,
  organizationId,
  match,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  match: BracketMatch | null;
  onCompleted: () => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) return;

    setSelected(null);
  }, [open]);

  async function submit() {
    if (match === null || selected === null) return;

    setBusy(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/matches/${match.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ winnerParticipantId: selected }),
      });

      toast.success("Match complete. The winner advanced.");
      onCompleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Declare the winner"
      description="The winner is seated in the next round. This cannot be undone."
    >
      <div className="mt-4 space-y-2">
        {(match?.participants ?? []).map((participant) => (
          <button
            key={participant.id}
            type="button"
            onClick={() => setSelected(participant.id)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border-2 p-3 text-left transition-colors",
              selected === participant.id
                ? "border-pink bg-pink/5"
                : "border-border bg-white/[0.02] hover:border-pink/40",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {participant.displayName ?? participant.externalUserId}
              </p>
              {participant.score !== null && (
                <p className="text-xs text-muted-foreground">score {participant.score}</p>
              )}
            </div>
            {selected === participant.id && (
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-pink text-[10px] font-bold text-ink">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={busy || selected === null}>
          {busy ? "Completing…" : "Complete match"}
        </Button>
      </div>
    </Dialog>
  );
}
