import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import type { RoleName } from "@/lib/role-types";

const ROLE_OPTIONS: { value: RoleName; label: string; ownerOnly: boolean }[] = [
  { value: "member", label: "Member — build and read", ownerOnly: false },
  { value: "admin", label: "Admin — manage the organization", ownerOnly: true },
];

export function InviteModal({
  open,
  onOpenChange,
  organizationId,
  myRole,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  myRole: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<RoleName>("member");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await authClient.organization.inviteMember({
      email,
      role,
      organizationId,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not send invitation");
      return;
    }

    toast.success(`Invitation sent to ${email}`);
    onInvited();
    onOpenChange(false);
  };

  const options = ROLE_OPTIONS.filter(
    (option) => !option.ownerOnly || myRole === "owner",
  ).map((option) => ({ value: option.value, label: option.label }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite a member"
      description="They get an email with a link to join this organization."
    >
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@studio.com"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as RoleName)}
            options={options}
          />
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
          <Button type="submit" size="sm" disabled={busy || !email}>
            {busy ? "Sending…" : "Send invitation"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
