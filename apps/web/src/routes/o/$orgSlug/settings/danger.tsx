import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconDownload, IconLoader2, IconTrash } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/primitives/page-header";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

export const Route = createFileRoute("/o/$orgSlug/settings/danger")({
  head: () => ({ meta: [{ title: "Danger zone · Wasanni" }] }),
  component: DangerZonePage,
});

function DangerZonePage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const [exporting, setExporting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (org === null) return null;

  async function exportData() {
    setExporting(true);

    try {
      const data = await apiFetch<unknown>(
        `/api/v1/organizations/${organizationId}/export`,
        { method: "POST" },
      );

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `wasanni-${orgSlug}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export");
    } finally {
      setExporting(false);
    }
  }

  async function deleteOrganization() {
    setDeleting(true);

    try {
      const { error } = await authClient.organization.delete({
        organizationId,
      });

      if (error) {
        toast.error(error.message ?? "Could not delete organization");
        setDeleting(false);
        return;
      }

      toast.success("Organization deleted");
      queryClient.clear();
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Danger zone"
        description="Actions here cannot be undone. Both need the owner role."
      />

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-white/[0.02] text-blue-soft">
              <IconDownload className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Export organization data</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Downloads a JSON file with members, platforms, games, files,
                assignments, configs, tournaments, matches, sessions, and scores.
                Sessions and scores are capped at 10,000 rows each. Stored files
                are not included.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={exportData}
                disabled={exporting}
              >
                {exporting ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconDownload className="size-3.5" />
                )}
                {exporting ? "Preparing…" : "Download export"}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="rounded-xl border border-rose-400/30 bg-rose-400/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-300">
              <IconTrash className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-rose-200">
                Delete this organization
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Deletes every game, platform, session, score, tournament, and
                match in this organization. Files in the bucket are not removed
                automatically. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => setDeleteOpen(true)}
              >
                Delete organization
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${org.name}?`}
        description="Every row for this organization is removed. Files in storage are not affected. This cannot be undone."
        confirmPhrase={org.slug}
        confirmLabel="Delete organization"
        destructive
        busy={deleting}
        onConfirm={deleteOrganization}
      />
    </div>
  );
}
