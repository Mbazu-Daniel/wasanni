import * as React from "react";
import {
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconMaximize,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import type { ArtifactFile } from "@/lib/agent-artifacts";

const byteLength = (body: string): number =>
  new TextEncoder().encode(body).length;

export function ChatFileChip({
  file,
  onOpen,
}: {
  file: ArtifactFile;
  onOpen?: (file: ArtifactFile) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const open = onOpen === undefined ? expanded : false;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(file.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(`Could not copy ${file.name}`);
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-launch-ink/25 bg-launch-ink/[0.04]",
        open && "border-launch-ink/45",
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            if (onOpen === undefined) setExpanded((current) => !current);
            else onOpen(file);
          }}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {onOpen === undefined ? (
            <IconChevronRight
              className={cn(
                "size-3.5 shrink-0 text-launch-ink/55 transition-transform",
                open && "rotate-90",
              )}
            />
          ) : (
            <IconMaximize className="size-3.5 shrink-0 text-launch-ink/55" />
          )}
          <span className="truncate font-mono text-[11px]">{file.name}</span>
        </button>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-launch-ink/50">
          {file.complete
            ? `${file.language || "text"} · ${file.body.split("\n").length} lines · ${formatBytes(byteLength(file.body))}`
            : `${file.language || "text"} · writing`}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${file.name}`}
          className="grid size-6 shrink-0 place-items-center rounded-md text-launch-ink/55 transition-colors hover:bg-launch-ink/10 hover:text-launch-ink"
        >
          {copied ? (
            <IconCheck className="size-3.5 text-emerald-400" />
          ) : (
            <IconCopy className="size-3.5" />
          )}
        </button>
      </div>

      {open && (
        <pre className="max-h-72 overflow-auto border-t border-launch-ink/20 bg-ink px-3 py-2.5 font-mono text-[11px] leading-relaxed text-paper">
          {file.body}
        </pre>
      )}
    </div>
  );
}
