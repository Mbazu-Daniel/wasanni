import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDeviceDesktop, IconLogout, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { toastAuthError } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";

export const Route = createFileRoute("/$orgSlug/settings/sessions")({
  head: () => ({ meta: [{ title: "Sessions · Wasanni" }] }),
  component: SessionsPage,
});

type UserSession = NonNullable<
  Awaited<ReturnType<typeof authClient.listSessions>>["data"]
>[number];

function SessionsPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });

  const run = async (
    key: string,
    action: () => Promise<{ error?: { code?: string | null; message?: string | null; status?: number | null } | null }>,
  ) => {
    setBusy(key);
    const { error } = await action();
    setBusy(null);

    if (error) {
      toastAuthError(error, "Something went wrong");
      return false;
    }

    return true;
  };

  const revokeSession = async (token: string) => {
    const ok = await run(`revoke-${token}`, () =>
      authClient.revokeSession({ token }),
    );
    if (!ok) return;
    queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
  };

  const revokeAll = async () => {
    const ok = await run("revoke-all", () => authClient.revokeOtherSessions());
    if (!ok) return;
    setRevokeAllOpen(false);
    toast.success("Other sessions signed out");
    queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
  };

  const columns: DataTableColumn<UserSession>[] = [
    {
      key: "device",
      header: "Device",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <IconDeviceDesktop className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm">{row.userAgent ?? "Unknown device"}</p>
            <p className="text-xs text-muted-foreground">
              {row.ipAddress ?? "No address"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Signed in",
      sortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      sortValue: (row) => new Date(row.expiresAt).getTime(),
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.expiresAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Revoke session"
          title="Revoke session"
          disabled={busy === `revoke-${row.token}`}
          className="text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
          onClick={() => void revokeSession(row.token)}
        >
          <IconTrash className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Devices signed in to your account."
        actions={
          sessions.length > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
              onClick={() => setRevokeAllOpen(true)}
            >
              <IconLogout className="size-4" />
              Sign out others
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={sessions}
        getRowId={(row) => row.id}
        empty={
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No sessions.
          </div>
        }
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="Sign out every other session?"
        description="Your current session stays active. Every other device is signed out."
        confirmLabel="Sign out others"
        destructive
        busy={busy === "revoke-all"}
        onConfirm={revokeAll}
      />
    </div>
  );
}
