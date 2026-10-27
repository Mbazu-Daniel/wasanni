import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconSettings, IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { ConfigEditorModal, type ConfigRow } from "./config-editor-modal";

export function ConfigsPanel({
  organizationId,
  gameId,
  assignmentId,
  gameHosting,
}: {
  organizationId: string;
  gameId: string;
  assignmentId: string;
  gameHosting: "hosted" | "external";
}) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = React.useState<ConfigRow | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<ConfigRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configs", organizationId, gameId, assignmentId],
    queryFn: () =>
      apiFetch<{ configs: ConfigRow[] }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments/${assignmentId}/configs`,
      ).then((response) => response.configs),
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["configs", organizationId, gameId, assignmentId],
    });

  async function remove() {
    if (deleting === null) return;

    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments/${assignmentId}/configs/${deleting.id}`,
        { method: "DELETE" },
      );
      toast.success("Config deleted");
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  const columns: DataTableColumn<ConfigRow>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <IconSettings className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.name}</span>
          {row.isDefault && (
            <Badge variant="success" className="text-[10px]">
              default
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "revision",
      header: "Revision",
      sortValue: (row) => row.revision,
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          v{row.revision}
        </span>
      ),
    },
    {
      key: "config",
      header: "Summary",
      render: (row) => {
        const config = row.config ?? {};
        const rules = (config.rules ?? {}) as {
          maxScore?: number;
          maxScorePerSecond?: number;
        };
        const verification = (config.scoreVerification ?? {}) as {
          mode?: string;
        };
        const duration = config.sessionDurationSeconds as number | undefined;

        const parts: string[] = [];

        if (duration !== undefined) parts.push(`${Math.round(duration / 60)}m`);
        if (rules.maxScore !== undefined) parts.push(`max ${rules.maxScore}`);
        if (verification.mode !== undefined && verification.mode !== "none") {
          parts.push(verification.mode);
        }

        return parts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {parts.map((part) => (
              <Badge key={part} variant="muted" className="text-[10px]">
                {part}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Empty config</span>
        );
      },
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortValue: (row) => row.updatedAt,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditor(row)}
            aria-label="Edit"
          >
            <IconPencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(row)}
            aria-label="Delete"
          >
            <IconTrash className="size-3.5 text-rose-300" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Configs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {configs.length === 0
              ? "No configs yet — sessions fall back to an empty config, which accepts every score without flags."
              : "Exactly one config can be the default. Sessions pick the default when no config is specified."}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setEditor("new")}
        >
          <IconPlus className="size-3.5" />
          New config
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={configs}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconSettings className="size-5" />}
            title="No configs yet"
            description={
              gameHosting === "hosted"
                ? "The empty config accepts every score without flags. Add a config to enforce rules like a maximum score."
                : "The empty config accepts every score without flags. Add a config to enable HMAC verification or a callback verifier."
            }
            primary={
              <Button size="sm" onClick={() => setEditor("new")} className="gap-1.5">
                <IconPlus className="size-3.5" />
                Create a config
              </Button>
            }
          />
        }
      />

      <ConfigEditorModal
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        organizationId={organizationId}
        gameId={gameId}
        assignmentId={assignmentId}
        existing={editor === "new" ? null : editor}
        onSaved={() => {
          setEditor(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Live sessions that used this config keep their snapshot. New sessions fall back to the default config."
        confirmPhrase={deleting?.name}
        confirmLabel="Delete config"
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}
