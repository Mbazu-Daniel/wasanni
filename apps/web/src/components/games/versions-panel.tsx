import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCloudUpload, IconPackage, IconFileCode } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { StatusPill } from "@/components/primitives/status-pill";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { UploadWizard } from "./upload-wizard";
import { PlayButton } from "./play-button";

type Version = {
  id: string;
  version: string;
  status: "pending_upload" | "extracting" | "ready" | "failed";
  isCurrent: boolean;
  kind: "single" | "bundle";
  sizeBytes: number;
  contentType: string;
  createdAt: string;
  readyAt: string | null;
};

export function GameVersionsPanel({
  organizationId,
  game,
}: {
  organizationId: string;
  game: {
    id: string;
    hosting: "hosted" | "external";
    status: "draft" | "active" | "archived";
  };
}) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Version | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["versions", organizationId, game.id],
    queryFn: () =>
      apiFetch<{ files: Version[] }>(
        `/api/v1/organizations/${organizationId}/games/${game.id}/files`,
      ).then((r) => r.files),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some(
        (v) => v.status === "extracting" || v.status === "pending_upload",
      )
        ? 2500
        : false;
    },
  });

  async function deleteVersion() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${game.id}/files/${deleting.id}`,
        { method: "DELETE" },
      );
      toast.success("Version deleted");
      setDeleting(null);
      queryClient.invalidateQueries({
        queryKey: ["versions", organizationId, game.id],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  if (game.hosting === "external") {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">This game is external</p>
        <p className="mt-1 text-xs text-muted-foreground">
          External games do not accept uploaded builds. The game runs on your
          own servers and calls the API.
        </p>
      </div>
    );
  }

  const columns: DataTableColumn<Version>[] = [
    {
      key: "version",
      header: "Version",
      render: (version) => (
        <div className="flex items-center gap-2">
          {version.kind === "bundle" ? (
            <IconPackage className="size-3.5 text-blue" />
          ) : (
            <IconFileCode className="size-3.5 text-cyan" />
          )}
          <span className="font-mono text-sm font-semibold">
            v{version.version}
          </span>
          {version.isCurrent && (
            <Badge variant="success" className="text-[10px]">
              current
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (version) => <StatusPill status={version.status} />,
    },
    {
      key: "sizeBytes",
      header: "Size",
      render: (version) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatBytes(version.sizeBytes)}
        </span>
      ),
      sortValue: (version) => version.sizeBytes,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      render: (version) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(version.createdAt)}
        </span>
      ),
      sortValue: (version) => version.createdAt,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (version) => (
        <div className="flex items-center justify-end gap-1">
          {version.status === "ready" && (
            <PlayButton
              gameId={game.id}
              fileId={version.id}
              hosting={game.hosting}
            />
          )}
          {!version.isCurrent && version.status === "ready" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-300"
              onClick={() => setDeleting(version)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Versions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One build per upload. The newest ready file is served for new
            sessions.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setUploadOpen(true)}
          disabled={game.status === "archived"}
        >
          <IconCloudUpload className="size-3.5" />
          Upload version
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={versions}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconCloudUpload className="size-5" />}
            title="No builds uploaded yet"
            description="Upload a Godot, Unity, or HTML5 build. index.html must be at the zip root for bundles."
            primary={
              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="gap-1.5"
              >
                <IconCloudUpload className="size-3.5" />
                Upload your first build
              </Button>
            }
          />
        }
      />

      <UploadWizard
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        organizationId={organizationId}
        gameId={game.id}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete v${deleting?.version}?`}
        description="Any session still using this version keeps its reference, but new sessions cannot pick it. This cannot be undone."
        confirmLabel="Delete version"
        destructive
        busy={busy}
        onConfirm={deleteVersion}
      />
    </div>
  );
}
