import * as React from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  confirmPhrase,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmPhrase?: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  const [phrase, setPhrase] = React.useState("");

  React.useEffect(() => {
    if (!open) setPhrase("");
  }, [open]);

  const canConfirm = !confirmPhrase || phrase === confirmPhrase;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!canConfirm || busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {destructive && (
        <div className="mb-4 grid size-10 place-items-center rounded-xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
          <IconAlertTriangle className="size-5" />
        </div>
      )}

      {confirmPhrase && (
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="confirm-phrase">
            Type <span className="font-mono text-foreground">{confirmPhrase}</span> to
            confirm
          </Label>
          <Input
            id="confirm-phrase"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            autoComplete="off"
          />
        </div>
      )}
    </Dialog>
  );
}
