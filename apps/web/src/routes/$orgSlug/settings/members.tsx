import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconUserPlus,
  IconUsers,
  IconDotsVertical,
  IconTrash,
  IconPencil,
  IconSettings,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { fetchSession } from "@/lib/session";
import { canChangeRole, canManageMembers } from "@/lib/org-permissions";
import type { RoleName } from "@/lib/role-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { EditMemberNameModal } from "@/components/members/member-name-modal";
import { InviteModal } from "@/components/members/invite-modal";

import type { InvitationRow, MemberRow } from "@/lib/member-types";

type Organization = { id: string; slug: string };

export const Route = createFileRoute("/$orgSlug/settings/members")({
  head: () => ({ meta: [{ title: "Members · Wasanni" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { org } = Route.useRouteContext();

  if (org === null) return null;

  return <MembersView org={org} />;
}

function MembersView({ org }: { org: Organization }) {
  const queryClient = useQueryClient();
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

  const saveName = async (member: MemberRow, name: string) => {
    const mine = member.userId === session?.user.id;
    const path = mine
      ? `/api/v1/organizations/${org.id}/members/me`
      : `/api/v1/organizations/${org.id}/members/${member.memberId}`;

    try {
      await apiFetch(path, {
        method: "PATCH",
        data: JSON.stringify({ name }),
      });
      toast.success("Name updated");
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
      sortValue: (row) => row.name,
      render: (member) => {
        const initial = member.name.slice(0, 1).toUpperCase();
        const mine = member.userId === session?.user.id;

        return (
          <div className="flex items-center gap-3">
            {member.avatar === null ? (
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-launch-ink/16 bg-launch-ink/[0.04] text-xs font-semibold text-launch-ink">
                {initial}
              </span>
            ) : (
              <img
                src={member.avatar}
                alt=""
                className="size-8 shrink-0 rounded-full border border-launch-ink/16 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {member.name}
                {mine && (
                  <Badge variant="muted" className="text-[10px]">
                    you
                  </Badge>
                )}
              </p>
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
        const mine = member.userId === session?.user.id;

        if (!mine && !canManage) return null;

        return (
          <details className="relative">
            <summary className="grid size-7 cursor-pointer list-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.07] hover:text-foreground [&::-webkit-details-marker]:hidden">
              <IconDotsVertical className="size-4" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-2xl">
              <button
                onClick={() => setEditing(member)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink/[0.08]"
              >
                <IconPencil className="size-3.5" />
                {mine ? "Edit your name" : "Edit name"}
              </button>
              {!mine && (
                <button
                  onClick={() => setRemoving(member)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-rose-300 hover:bg-rose-400/10"
                >
                  <IconTrash className="size-3.5" />
                  Remove member
                </button>
              )}
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
        actions={
          canManage ? (
            <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <IconUserPlus className="size-3.5" />
              Invite
            </Button>
          ) : null
        }
      />

      {me && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {me.avatar === null ? (
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-launch-ink/16 bg-launch-ink/[0.04] text-sm font-semibold text-launch-ink">
                {me.name.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <img
                src={me.avatar}
                alt=""
                className="size-10 shrink-0 rounded-full border border-launch-ink/16 object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium">{me.name}</p>
              <p className="text-xs text-muted-foreground">
                This is how teammates see you in this workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="capitalize">
              {me.role}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing(me)}>
              Edit profile
            </Button>
          </div>
        </div>
      )}

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

      {canManage && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconSettings className="size-3.5" />
          Roles decide what a member can build and read.
          <Link
            to="/$orgSlug/settings/organization"
            params={{ orgSlug: org.slug }}
            className="text-blue hover:underline"
          >
            Organization settings
          </Link>
        </p>
      )}

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={org.id}
        myRole={myRole}
        onInvited={refresh}
      />

      <EditMemberNameModal
        member={editing}
        mine={editing?.userId === session?.user.id}
        onClose={() => setEditing(null)}
        onSave={saveName}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "member"}?`}
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
