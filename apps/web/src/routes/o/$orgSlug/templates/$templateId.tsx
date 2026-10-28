import * as React from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCloudUpload,
  IconPackage,
  IconDownload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/primitives/page-header";
import { StatusPill } from "@/components/primitives/status-pill";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { FileDrop, PickedFileRow, type PickedFile } from "@/components/primitives/file-drop";
import { Dialog } from "@/components/ui/dialog";

type Template = {
  id: string;
  kind: "game" | "tournament";
  name: string;
  slug: string;
  description: string | null;
  status: "pending_upload" | "ready" | "failed";
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
};

const MAX_TEMPLATE_BYTES = 50 * 1024 * 1024;

export const Route = createFileRoute("/o/$orgSlug/templates/$templateId")({
  head: () => ({ meta: [{ title: "Template · Wasanni" }] }),
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const { templateId } = useParams({ from: "/o/$orgSlug/templates/$templateId" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const { data: template } = useQuery({
    queryKey: ["template", organizationId, templateId],
    queryFn: async () => {
      const { templates } = await apiFetch<{ templates: Template[] }>(
        `/api/v1/organizations/${organizationId}/templates`,
      );
      return templates.find((row) => row.id === templateId) ?? null;
    },
  });

  async function deleteTemplate() {
    setDeleting(true);

    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/templates/${templateId}`, {
        method: "DELETE",
      });
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["templates", organizationId] });
      navigate({ to: "/o/$orgSlug/templates", params: { orgSlug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setDeleting(false);
    }
  }

  async function download() {
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/v1/organizations/${organizationId}/templates/${templateId}/download-url`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download");
    }
  }

  if (!template) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/o/$orgSlug/templates"
          params={{ orgSlug }}
          className="hover:text-foreground"
        >
          Templates
        </Link>
        <span>/</span>
        <span className="text-foreground">{template.name}</span>
      </div>

      <PageHeader
        title={template.name}
        description={template.description ?? "No description."}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="font-mono">
              {template.slug}
            </Badge>
            <StatusPill status={template.status} />
          </div>
        }
      />

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <IconPackage className="size-4 text-blue-soft" />
                <p className="text-sm font-semibold">Template bundle</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {template.status === "ready"
                  ? `${formatBytes(template.sizeBytes ?? 0)} · uploaded ${formatDateTime(template.updatedAt)}`
                  : "No bundle uploaded yet. Zip your HTML, CSS, and assets together."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {template.status === "ready" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={download}
                >
                  <IconDownload className="size-3.5" />
                  Download
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setUploadOpen(true)}
              >
                <IconCloudUpload className="size-3.5" />
                {template.status === "ready" ? "Replace bundle" : "Upload bundle"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5">
          <p className="text-sm font-semibold">Details</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <dt className="text-xs text-muted-foreground">Kind</dt>
              <dd className="capitalize">{template.kind}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <dt className="text-xs text-muted-foreground">Slug</dt>
              <dd className="font-mono text-xs">{template.slug}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="text-xs">{formatDateTime(template.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Updated</dt>
              <dd className="text-xs">{formatDateTime(template.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.03] p-5">
          <p className="text-sm font-semibold">Delete template</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Games using this template fall back to the platform default. This
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setDeleteOpen(true)}
          >
            Delete template
          </Button>
        </div>
      </div>

      <TemplateUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        organizationId={organizationId}
        templateId={templateId}
        isReplace={template.status === "ready"}
        onComplete={() => {
          setUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ["templates", organizationId] });
          queryClient.invalidateQueries({
            queryKey: ["template", organizationId, templateId],
          });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${template.name}?`}
        description="Games using this template fall back to the default. This cannot be undone."
        confirmPhrase={template.name}
        confirmLabel="Delete template"
        destructive
        busy={deleting}
        onConfirm={deleteTemplate}
      />
    </div>
  );
}

function TemplateUploadModal({
  open,
  onOpenChange,
  organizationId,
  templateId,
  isReplace,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  templateId: string;
  isReplace: boolean;
  onComplete: () => void;
}) {
  const [picked, setPicked] = React.useState<PickedFile | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [phase, setPhase] = React.useState<
    "select" | "uploading" | "confirming" | "done" | "failed"
  >("select");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) return;

    setPicked(null);
    setProgress(0);
    setPhase("select");
    setError(null);
  }, [open]);

  async function startUpload() {
    if (picked === null) return;

    setPhase("uploading");
    setProgress(0);
    setError(null);

    try {
      const { upload } = await apiFetch<{
        upload: {
          url: string;
          method: "PUT";
          headers: Record<string, string>;
        };
      }>(`/api/v1/organizations/${organizationId}/templates/${templateId}/upload`, {
        method: "POST",
        body: JSON.stringify({
          filename: picked.name,
          contentType: picked.contentType,
          sizeBytes: picked.sizeBytes,
        }),
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(upload.method, upload.url, true);

        for (const [key, value] of Object.entries(upload.headers)) {
          xhr.setRequestHeader(key, value);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress((event.loaded / event.total) * 100);
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Storage rejected the upload (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.timeout = 5 * 60 * 1000;
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.send(picked.file);
      });

      setPhase("confirming");

      await apiFetch(
        `/api/v1/organizations/${organizationId}/templates/${templateId}/complete`,
        { method: "POST" },
      );

      setPhase("done");
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
      setPhase("failed");
    }
  }

  const title =
    phase === "select"
      ? isReplace
        ? "Replace template bundle"
        : "Upload template bundle"
      : phase === "uploading"
        ? "Uploading…"
        : phase === "confirming"
          ? "Confirming…"
          : phase === "done"
            ? "Upload complete"
            : "Upload failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} className="w-[min(92vw,520px)]">
      {phase === "select" && (
        <div className="mt-4 space-y-4">
          <FileDrop
            onPick={setPicked}
            accept={["zip"]}
            maxBytes={MAX_TEMPLATE_BYTES}
            helper="A .zip containing your template's HTML, CSS, and assets"
          />
          {picked && <PickedFileRow picked={picked} />}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={startUpload} disabled={picked === null}>
              Upload
            </Button>
          </div>
        </div>
      )}

      {(phase === "uploading" || phase === "confirming") && (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            {phase === "uploading" ? "Sending to storage…" : "Verifying the upload…"}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ff2e88,#2e7bff)] transition-[width] duration-200"
              style={{ width: phase === "uploading" ? `${progress}%` : "100%" }}
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {phase === "uploading" ? `${Math.round(progress)}%` : "finalizing…"}
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm font-medium">Bundle is ready</p>
          <p className="text-xs text-muted-foreground">
            Games using this template now serve the new bundle.
          </p>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      )}

      {phase === "failed" && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm font-medium">Upload failed</p>
          <p className="text-xs text-muted-foreground">
            {error ?? "Unknown error"}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPhase("select");
                setPicked(null);
                setError(null);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
