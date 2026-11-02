import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AssignOption = { id: string; name: string; slug: string };

export function AssignModal({
  open,
  onOpenChange,
  title,
  description,
  label,
  options,
  emptyHint,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  options: AssignOption[];
  emptyHint: string;
  onAssign: (id: string) => Promise<boolean>;
}) {
  const [selected, setSelected] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) setSelected("");
  }, [open]);

  const effectiveSelected = selected !== "" ? selected : (options[0]?.id ?? "");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveSelected === "") return;

    setBusy(true);
    const ok = await onAssign(effectiveSelected);
    setBusy(false);

    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Select
            value={effectiveSelected}
            onValueChange={setSelected}
            options={options.map((option) => ({
              value: option.id,
              label: `${option.name} (${option.slug})`,
            }))}
          />
        </div>
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || effectiveSelected === ""}>
            {busy ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
