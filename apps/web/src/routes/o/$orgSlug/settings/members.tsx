import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconUserPlus,
  IconUsers,
  IconDotsVertical,
  IconTrash,
  IconPencil,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { fetchSession } from "@/lib/session";
import {
  canChangeRole,
  canManageMembers,
  type RoleName,
} from "@/lib/org-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

type MemberRow = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  displayName: string | null;
  joinedAt: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

export const Route = createFileRoute("/o/$orgSlug/settings/members")({
  head: () => ({ meta: [{ title: "Members · Wasanni" }] }),
  component: MembersPage,
});

function MembersPage() {
  const queryClient = useQueryClient();
  const { org } = Route.useRouteContext();

  if (org === null) return null;

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<MemberRow | null>(null);
  const [editing, setEditing] = React.useState<MemberRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", org.id],
    queryFn: () =>
      apiFetch<{ members: MemberRow[] }>(
        `/api/v1/organizations/${org.id}/members`,
      ).then((response) => response.members),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", org.id],
    queryFn: async () => {
      const { data } = await authClient.organization.listInvitations({
        query: { organizationId: org.id },
      });

      return (data ?? []) as unknown as InvitationRow[];
    },
  });

  const me = members.find((member) => member.userId === session?.user.id);
  const myRole = me?.role ?? "member";
  const canManage = canManageMembers(myRole);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["members", org.id] });
    queryClient.invalidateQueries({ queryKey: ["invitations", org.id] });
  };

  const changeRole = async (member: MemberRow, role: RoleName) => {
    const { error } = await authClient.organization.updateMemberRole({
      memberId: member.memberId,
      role,
      organizationId: org.id,
    });

    if (error) {
      toast.error(error.message ?? "Could not change role");
      return;
    }

    toast.success(`Role updated to ${role}`);
    refresh();
  };

  const removeMember = async () => {
    if (removing === null) return;

    setBusy(true);
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: removing.memberId,
      organizationId: org.id,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not remove member");
      return;
    }

    toast.success("Member removed");
    setRemoving(null);
    refresh();
  };

  const saveDisplayName = async (member: MemberRow, displayName: string) => {
    try {
      await apiFetch(`/api/v1/organizations/${org.id}/members/${member.memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
      });
      toast.success("Display name updated");
      setEditing(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  };

  const cancelInvitation = async (invitation: InvitationRow) => {
    const { error } = await authClient.organization.cancelInvitation({
      invitationId: invitation.id,
    });

    if (error) {
      toast.error(error.message ?? "Could not cancel");
      return;
    }

    toast.success("Invitation cancelled");
    refresh();
  };

  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Member",
      sortValue: (row) => row.displayName ?? row.name,
      render: (member) => {
        const label = member.displayName ?? member.name;
        const initial = label.slice(0, 1).toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,#ff2e88,#2e7bff)] text-xs font-semibold text-ink">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      sortValue: (row) => row.role,
      render: (member) => {
        const editable =
          canManage &&
          canChangeRole(myRole, member.role) &&
          member.userId !== session?.user.id;

        if (!editable) {
          return (
            <Badge
              variant={
                member.role === "owner"
                  ? "default"
                  : member.role === "admin"
                    ? "blue"
                    : "muted"
              }
              className="capitalize"
            >
              {member.role}
            </Badge>
          );
        }

        return (
          <Select
            value={member.role}
            onValueChange={(role) => void changeRole(member, role as RoleName)}
            options={[
              { value: "owner", label: "Owner" },
              { value: "admin", label: "Admin" },
              { value: "member", label: "Member" },
            ]}
            className="w-[130px]"
          />
        );
      },
    },
    {
      key: "joinedAt",
      header: "Joined",
      sortValue: (row) => row.joinedAt,
      render: (member) => (
        <span className="text-xs text-muted-foreground">
          {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (member) => {
        if (!canManage || member.userId === session?.user.id) return null;

        return (
          <details className="relative">
            <summary className="grid size-7 cursor-pointer list-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground [&::-webkit-details-marker]:hidden">
              <IconDotsVertical className="size-4" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-2xl">
              <button
                onClick={() => setEditing(member)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/[0.06]"
              >
                <IconPencil className="size-3.5" />
                Edit display name
              </button>
              <button
                onClick={() => setRemoving(member)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-rose-300 hover:bg-rose-400/10"
              >
                <IconTrash className="size-3.5" />
                Remove member
              </button>
            </div>
          </details>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Members"
        description="People with access to this organization."
        actions={
          canManage ? (
            <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <IconUserPlus className="size-3.5" />
              Invite
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={members}
        loading={isLoading}
        getRowId={(row) => row.memberId}
        empty={
          <EmptyState
            icon={<IconUsers className="size-5" />}
            title="No members yet"
            description="Invite teammates to give them access to this organization."
          />
        }
      />

      {invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Pending invitations</h2>
          <div className="mt-3 space-y-1.5">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{invitation.email}</span>
                  <Badge variant="muted" className="capitalize">
                    {invitation.role ?? "member"}
                  </Badge>
                  <Badge variant="warning">{invitation.status}</Badge>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void cancelInvitation(invitation)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={org.id}
        onInvited={refresh}
      />

      <EditDisplayNameModal
        member={editing}
        onClose={() => setEditing(null)}
        onSave={saveDisplayName}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.displayName ?? removing?.name ?? "member"}?`}
        description="They lose access to every game, platform, and session in this organization."
        confirmPhrase={removing?.name}
        confirmLabel="Remove member"
        destructive
        busy={busy}
        onConfirm={removeMember}
      />
    </div>
  );
}

function InviteModal({
  open,
  onOpenChange,
  organizationId,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
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
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as RoleName)}
            options={[
              { value: "member", label: "Member — read only" },
              { value: "admin", label: "Admin — full manage" },
              { value: "owner", label: "Owner — full control" },
            ]}
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

function EditDisplayNameModal({
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
