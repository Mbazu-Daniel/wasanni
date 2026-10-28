import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  IconCheck,
  IconAlertTriangle,
  IconLoader2,
  IconPackage,
  IconFileCode,
  IconArrowRight,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { uploadWithProgress } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileDrop, type PickedFile } from "@/components/primitives/file-drop";

type Phase =
  | "select"
  | "configure"
  | "uploading"
  | "confirming"
  | "extracting"
  | "done"
  | "failed";

type UploadTarget = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  sizeBytes: number;
};

type CreatedFile = {
  id: string;
  status: "pending_upload" | "extracting" | "ready" | "failed";
  version: string;
  kind: "single" | "bundle";
};

const ACCEPT = ["zip", "html", "htm", "wasm", "js"];

const TITLES: Record<Phase, string> = {
  select: "Upload a build",
  configure: "Configure this version",
  uploading: "Uploading…",
  confirming: "Confirming…",
  extracting: "Extracting bundle…",
  done: "Upload complete",
  failed: "Upload failed",
};

export function UploadWizard({
  open,
  onOpenChange,
  organizationId,
  gameId,
  maxBundleBytes = 200 * 1024 * 1024,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  gameId: string;
  maxBundleBytes?: number;
}) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = React.useState<Phase>("select");
  const [picked, setPicked] = React.useState<PickedFile | null>(null);
  const [version, setVersion] = React.useState("1.0.0");
  const [entryPoint, setEntryPoint] = React.useState("index.html");
  const [crossOriginIsolation, setCrossOriginIsolation] = React.useState(false);
  const [spaFallback, setSpaFallback] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [createdFile, setCreatedFile] = React.useState<CreatedFile | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const kind: "single" | "bundle" | null = picked
    ? picked.name.toLowerCase().endsWith(".zip")
      ? "bundle"
      : "single"
    : null;

  React.useEffect(() => {
    if (!open) {
      setPhase("select");
      setPicked(null);
      setVersion("1.0.0");
      setEntryPoint("index.html");
      setCrossOriginIsolation(false);
      setSpaFallback(false);
      setProgress(0);
      setCreatedFile(null);
      setError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (phase !== "extracting" || !createdFile) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const { files } = await apiFetch<{ files: CreatedFile[] }>(
          `/api/v1/organizations/${organizationId}/games/${gameId}/files`,
        );
        if (cancelled) return;
        const row = files.find((f) => f.id === createdFile.id);
        if (!row) return;

        if (row.status === "ready") {
          setCreatedFile(row);
          setPhase("done");
          queryClient.invalidateQueries({
            queryKey: ["versions", organizationId, gameId],
          });
        } else if (row.status === "failed") {
          setError(
            "The bundle could not be extracted. Check that index.html is at the zip root and try again.",
          );
          setPhase("failed");
        }
      } catch {}
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, createdFile, organizationId, gameId, queryClient]);

  async function startUpload() {
    if (!picked || !kind) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);

    try {
      const { file, upload } = await apiFetch<{
        file: CreatedFile;
        upload: UploadTarget;
      }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/files/upload`,
        {
          method: "POST",
          data: JSON.stringify({
            filename: picked.name,
            version,
            contentType: picked.contentType,
            sizeBytes: picked.sizeBytes,
            kind,
            ...(kind === "bundle"
              ? { entryPoint, crossOriginIsolation, spaFallback }
              : {}),
          }),
        },
      );

      setCreatedFile(file);

      await uploadWithProgress(
        upload.url,
        upload.method,
        upload.headers,
        picked.file,
        setProgress,
      );

      setPhase("confirming");

      const { file: confirmed } = await apiFetch<{ file: CreatedFile }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/files/${file.id}/complete`,
        { method: "POST" },
      );

      setCreatedFile(confirmed);
      queryClient.invalidateQueries({
        queryKey: ["versions", organizationId, gameId],
      });

      if (confirmed.status === "ready") {
        setPhase("done");
      } else if (confirmed.status === "extracting") {
        setPhase("extracting");
      } else {
        setError("Upload validation failed.");
        setPhase("failed");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed unexpectedly";
      setError(message);
      setPhase("failed");
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && (phase === "uploading" || phase === "confirming")) {
          toast.error("Upload in progress");
          return;
        }
        onOpenChange(next);
      }}
      title={TITLES[phase]}
      className="w-[min(92vw,600px)]"
    >
      {phase === "select" && (
        <div className="mt-4 space-y-4">
          <FileDrop
            accept={ACCEPT}
            onPick={(file) => {
              setPicked(file);
              setPhase("configure");
            }}
            maxBytes={maxBundleBytes}
            helper={`Accepts ${ACCEPT.map((e) => `.${e}`).join(", ")} up to ${formatBytes(maxBundleBytes)}`}
          />
          <p className="text-xs text-muted-foreground">
            For zips, index.html must sit at the root of the archive, not inside
            a folder.
          </p>
        </div>
      )}

      {phase === "configure" && picked && kind && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-ink/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-ink/[0.05] text-blue">
                {kind === "bundle" ? (
                  <IconPackage className="size-4" />
                ) : (
                  <IconFileCode className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{picked.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(picked.sizeBytes)} ·{" "}
                  {kind === "bundle" ? "bundle" : "single file"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPicked(null);
                  setPhase("select");
                }}
              >
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-version">Version</Label>
            <Input
              id="upload-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="1.4.0"
              pattern="^[a-zA-Z0-9._-]+$"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use the version string from your build. Wasanni does not compare
              versions — the newest ready file wins.
            </p>
          </div>

          {kind === "bundle" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="upload-entry">Entry point</Label>
                <Input
                  id="upload-entry"
                  value={entryPoint}
                  onChange={(event) => setEntryPoint(event.target.value)}
                  placeholder="index.html"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be a file at the zip root. Godot and Unity both default
                  to index.html.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Cross-origin isolation
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Required for Godot 4 threaded exports and Unity
                      multithreaded WebGL. Adds COOP/COEP headers on every
                      served file.
                    </p>
                  </div>
                  <Switch
                    checked={crossOriginIsolation}
                    onCheckedChange={setCrossOriginIsolation}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">SPA fallback</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Serve index.html for any extensionless path. Useful for
                      single-page apps that handle their own routing.
                    </p>
                  </div>
                  <Switch checked={spaFallback} onCheckedChange={setSpaFallback} />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={startUpload}
              disabled={!version || (kind === "bundle" && !entryPoint)}
              className="gap-1.5"
            >
              Upload
              <IconArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {(phase === "uploading" ||
        phase === "confirming" ||
        phase === "extracting") && (
        <div className="mt-6">
          <UploadProgress phase={phase} progress={progress} version={version} />
        </div>
      )}

      {phase === "done" && createdFile && picked && (
        <div className="mt-6 space-y-5">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="grid size-14 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <IconCheck className="size-6" />
            </div>
            <p className="mt-4 text-sm font-medium">
              v{version} is ready to play
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {picked.name} · {formatBytes(picked.sizeBytes)}
            </p>
          </motion.div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setPicked(null);
                setPhase("select");
                setVersion("1.0.0");
                setEntryPoint("index.html");
                setCreatedFile(null);
              }}
            >
              Upload another
            </Button>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-full border border-rose-400/30 bg-rose-400/10 text-rose-300">
              <IconAlertTriangle className="size-6" />
            </div>
            <p className="mt-4 text-sm font-medium">Upload failed</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {error ?? "Something went wrong. Try again."}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPhase("select");
                setPicked(null);
                setCreatedFile(null);
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

function UploadProgress({
  phase,
  progress,
  version,
}: {
  phase: "uploading" | "confirming" | "extracting";
  progress: number;
  version: string;
}) {
  const label =
    phase === "uploading"
      ? `Uploading v${version} to storage`
      : phase === "confirming"
        ? "Verifying the upload"
        : "Extracting the bundle";

  const pct = phase === "uploading" ? progress : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <IconLoader2 className="size-4 animate-spin text-pink" />
        <span>{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/[0.08]">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff2e88,#2e7bff)]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {phase === "uploading"
          ? `${Math.round(progress)}%`
          : phase === "confirming"
            ? "confirming…"
            : "polling for extraction…"}
      </p>
    </div>
  );
}

