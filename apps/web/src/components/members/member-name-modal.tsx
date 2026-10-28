import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRow } from "@/lib/member-types";

export function EditMemberNameModal({
  member,
  mine = false,
  onClose,
  onSave,
}: {
  member: MemberRow | null;
  mine?: boolean;
  onClose: () => void;
  onSave: (member: MemberRow, name: string) => Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (member) setValue(member.name);
  }, [member]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (member === null || value.trim().length === 0) return;

    setBusy(true);
    await onSave(member, value.trim());
    setBusy(false);
  };

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title={mine ? "Your name here" : "Member name"}
      description={
        mine
          ? "This is how teammates see you in this workspace. Your sign-in account is unchanged."
          : "Shown in this workspace only. Their account name is unchanged."
      }
    >
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="member-name">Name</Label>
          <Input
            id="member-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={80}
            required
            autoFocus
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
          <Button type="submit" size="sm" disabled={busy || value.trim().length === 0}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
