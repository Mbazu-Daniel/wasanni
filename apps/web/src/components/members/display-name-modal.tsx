import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRow } from "@/lib/member-types";

export function EditDisplayNameModal({
  member,
  onClose,
  onSave,
}: {
  member: MemberRow | null;
  onClose: () => void;
  onSave: (member: MemberRow, displayName: string) => Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (member) setValue(member.displayName ?? "");
  }, [member]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (member === null) return;

    setBusy(true);
    await onSave(member, value);
    setBusy(false);
  };

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Display name"
      description="Shown in this organization only. Falls back to their account name when empty."
    >
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={member?.name}
            maxLength={80}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
