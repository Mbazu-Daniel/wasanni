import { Link } from "@tanstack/react-router";
import { IconPaperclip, IconPlayerStop, IconSend, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import type { AgentAttachment, AgentProviderView } from "@/lib/agent-types";
import { AGENT_MODES } from "./constants.ts";
import type { AgentMode } from "./types.ts";

export function Composer({
  orgSlug,
  draft,
  onDraftChange,
  attachments,
  onRemoveAttachment,
  onAddAttachments,
  onStartIntegration,
  mode,
  onModeChange,
  running,
  onStop,
  onSend,
  onRunPlan,
  lastSentMode,
  providers,
  chosenProviderId,
  onProviderChange,
  approvalPending,
}: {
  orgSlug: string;
  draft: string;
  onDraftChange: (value: string) => void;
  attachments: AgentAttachment[];
  onRemoveAttachment: (index: number) => void;
  onAddAttachments: (files: FileList | null) => void;
  onStartIntegration: () => void;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  running: boolean;
  onStop: () => void;
  onSend: () => void;
  onRunPlan: () => void;
  lastSentMode: AgentMode | null;
  providers: AgentProviderView[];
  chosenProviderId: string;
  onProviderChange: (providerId: string) => void;
  approvalPending: boolean;
}) {
  return (
    <div className="border-t-2 border-launch-ink/85 px-5 pb-2.5 pt-3">
      <div className="mx-auto w-full max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((attachment, index) => (
              <span
                key={`${attachment.name}-${index}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-launch-ink/20 bg-card px-2.5 py-1 text-xs"
              >
                <span className="max-w-44 truncate">{attachment.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => onRemoveAttachment(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <IconX className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="rounded-2xl border-2 border-launch-ink bg-card focus-within:ring-1 focus-within:ring-ring">
          <textarea
            value={draft}
            rows={2}
            placeholder={
              providers.length === 0
                ? "Add a provider first"
                : "Build a one-file dodge game with a score counter…"
            }
            disabled={providers.length === 0 || approvalPending}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && running) {
                event.preventDefault();
                onStop();
                return;
              }
              if (
                event.key === "Enter" &&
                (event.metaKey || event.ctrlKey || !event.shiftKey)
              ) {
                event.preventDefault();
                onSend();
              }
            }}
            className="min-h-[44px] w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          <div className="flex items-center gap-1.5 px-2 pb-2">
            <input
              id="agent-attachments"
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.pdf"
              className="sr-only"
              onChange={(event) => {
                onAddAttachments(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach files"
              onClick={() => document.getElementById("agent-attachments")?.click()}
              disabled={running || attachments.length >= 8}
            >
              <IconPaperclip />
            </Button>
            {attachments.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onStartIntegration}
                disabled={running || providers.length === 0}
              >
                Integrate with Wasanni
              </Button>
            )}
            <div
              role="group"
              aria-label="Agent mode"
              className="flex items-center gap-0.5 rounded-lg border border-input bg-ink/[0.04] p-0.5"
            >
              {AGENT_MODES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  aria-pressed={mode === entry.value}
                  onClick={() => onModeChange(entry.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                    mode === entry.value
                      ? "bg-launch-ink text-paper"
                      : "text-launch-ink/55 hover:text-launch-ink",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {running ? (
                <Button type="button" variant="destructive" size="sm" onClick={onStop}>
                  <IconPlayerStop />
                  Stop
                </Button>
              ) : (
                <>
                  {lastSentMode === "plan" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRunPlan}
                      disabled={providers.length === 0}
                    >
                      Run this plan
                    </Button>
                  )}
                  {draft.trim() !== "" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onSend}
                      disabled={providers.length === 0}
                    >
                      <IconSend />
                      Send
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3">
          {providers.length === 0 ? (
            <Link
              to="/$orgSlug/providers"
              params={{ orgSlug }}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink hover:underline"
            >
              add a provider
            </Link>
          ) : (
            <SearchableSelect
              compact
              className="w-60 shrink-0"
              value={chosenProviderId}
              onValueChange={onProviderChange}
              options={providers.map((provider) => ({
                value: provider.id,
                label: `${provider.name} · ${provider.model}`,
              }))}
            />
          )}
          <p className="text-[10px] text-muted-foreground">
            Runs on the model and key you picked. It can be wrong — check what it builds.
          </p>
        </div>
      </div>
    </div>
  );
}
