import * as React from "react";
import { toast } from "sonner";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import { ChatMarkdown } from "@/components/primitives/chat-markdown";
import { cn } from "@/lib/utils";
import { formatDuration, formatTokens, formatUsd } from "@/lib/format";
import type { ArtifactFile } from "@/lib/agent-artifacts";
import type { AgentTurnView } from "@/lib/agent-types";

export function TurnBubble({
  turn,
  showing,
  hasArtifact,
  onShow,
  trimmedMessages,
  onOpenFile,
  onRegenerate,
}: {
  turn: AgentTurnView;
  showing: boolean;
  hasArtifact: boolean;
  onShow: () => void;
  trimmedMessages: number;
  onOpenFile: (file: ArtifactFile) => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(turn.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the answer");
    }
  };

  const action =
    "font-mono text-[10px] uppercase tracking-[0.12em] text-launch-ink/45 hover:text-launch-ink";

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "px-1",
          showing && "rounded-r-xl border-l-[3px] border-pink bg-card/60 px-3.5 py-2",
        )}
      >
        <ChatMarkdown text={turn.text} onOpenFile={onOpenFile} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 px-1">
        <p className={action}>
          {turn.costMicros > 0 ? formatUsd(turn.costMicros) : "unpriced"}
        </p>
        <p className={action}>
          {`${formatTokens(turn.promptTokens + turn.completionTokens)} · ${formatDuration(turn.durationMs)}`}
        </p>
        {trimmedMessages > 0 && (
          <p className={action}>
            {`dropped the oldest ${trimmedMessages} ${trimmedMessages === 1 ? "message" : "messages"} to fit the provider`}
          </p>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className={cn(action, "hover:underline")}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1 text-emerald-500">
              <IconCheck size={11} /> copied
            </span>
          ) : (
            "copy"
          )}
        </button>
        {hasArtifact && (
          <button
            type="button"
            onClick={onShow}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink/70 hover:text-pink hover:underline"
          >
            {showing ? "shown in the pane" : "show artifact"}
          </button>
        )}
        {onRegenerate !== undefined && (
          <button
            type="button"
            onClick={onRegenerate}
            className={cn(action, "hover:underline")}
          >
            <span className="inline-flex items-center gap-1">
              <IconRefresh size={11} /> regenerate
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
