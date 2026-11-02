import * as React from "react";
import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";
import { ChatMarkdown } from "@/components/primitives/chat-markdown";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ArtifactFile } from "@/lib/agent-artifacts";
import { MARKDOWN, PREVIEW_WIDTHS, PROSE, type PreviewWidth } from "./constants.ts";
import { PaneTitle } from "./pane-title.tsx";

const namedAs = (file: ArtifactFile, pattern: RegExp): boolean =>
  pattern.test(file.name) || pattern.test(`.${file.language}`);

export function ArtifactPane({
  pane,
  onPaneChange,
  html,
  files,
  selectedName,
  onSelect,
  version,
  onIntegrate,
}: {
  pane: string;
  onPaneChange: (pane: string) => void;
  html: string | null;
  files: ArtifactFile[];
  selectedName: string | null;
  onSelect: (file: ArtifactFile) => void;
  version: string | null;
  onIntegrate: (file: ArtifactFile) => void;
}) {
  const newest = files[files.length - 1];
  const fallback = newest?.complete === false ? newest : files[0];
  const current = files.find((entry) => entry.name === selectedName) ?? fallback;
  const [source, setSource] = React.useState(false);
  const [previewWidth, setPreviewWidth] = React.useState<PreviewWidth>("fill");

  const prose = current !== undefined && namedAs(current, PROSE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
        <PaneTitle>Artifact</PaneTitle>
        <Tabs
          className="border-0"
          value={pane}
          onValueChange={onPaneChange}
          items={[
            { value: "preview", label: "Preview" },
            { value: "code", label: files.length === 0 ? "Code" : `Code (${files.length})` },
          ]}
        />
      </div>

      <div className={pane === "preview" ? "flex min-h-0 flex-1 flex-col gap-2 p-4" : "hidden"}>
        {html !== null && (
          <div className="flex items-center gap-1 self-end">
            <button
              type="button"
              onClick={() =>
                onIntegrate(
                  current ?? { name: "index.html", language: "html", body: html, complete: true },
                )
              }
              className="mr-auto rounded-full border border-pink/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-pink/80 hover:border-pink hover:text-pink"
            >
              Integrate with Wasanni
            </button>
            {PREVIEW_WIDTHS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                aria-pressed={previewWidth === entry.value}
                onClick={() => setPreviewWidth(entry.value)}
                className={cn(
                  "grid size-7 place-items-center rounded-full border transition-colors",
                  previewWidth === entry.value
                    ? "border-launch-ink bg-ink text-paper"
                    : "border-launch-ink/20 text-launch-ink/60 hover:border-launch-ink/45 hover:text-launch-ink",
                )}
              >
                {entry.value === "fill" ? (
                  <IconDeviceDesktop size={13} />
                ) : (
                  <IconDeviceMobile size={13} />
                )}
              </button>
            ))}
          </div>
        )}

        {html === null ? (
          <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-launch-ink/30 p-6 text-center">
            <div>
              <p className="text-sm font-medium">Nothing to render yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Ask for a game or a page and the answer renders here, in a sandboxed frame.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "min-h-0 flex-1",
              previewWidth === "phone" && "mx-auto w-[390px] max-w-full",
            )}
          >
            <iframe
              title="Agent artifact preview"
              srcDoc={html}
              sandbox="allow-scripts"
              className="h-full w-full rounded-xl border-2 border-launch-ink bg-white"
            />
          </div>
        )}
      </div>

      <div className={pane === "code" ? "flex min-h-0 flex-1 flex-col gap-3 p-4" : "hidden"}>
        {files.length === 0 && (
          <div className="grid h-full place-items-center rounded-xl border-2 border-dashed border-launch-ink/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              The answer has no code block in it.
            </p>
          </div>
        )}

        {files.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {files.map((entry, index) => (
                <button
                  key={`${entry.name}-${index}`}
                  type="button"
                  onClick={() => onSelect(entry)}
                  className={
                    entry.name === current?.name
                      ? "rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] text-paper"
                      : "rounded-full border border-launch-ink/20 px-2.5 py-1 font-mono text-[10px] text-launch-ink/60 hover:border-launch-ink/45 hover:text-launch-ink"
                  }
                >
                  {entry.name}
                  {entry.complete ? "" : " · writing"}
                </button>
              ))}

              {prose && (
                <button
                  type="button"
                  onClick={() => setSource((current) => !current)}
                  className="ml-auto rounded-full border border-launch-ink/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-launch-ink/60 hover:border-launch-ink/45 hover:text-launch-ink"
                >
                  {source ? "read" : "source"}
                </button>
              )}
            </div>

            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-launch-ink/55">
              {current.name}
              {` · ${current.body.split("\n").length} lines`}
              {version === null ? "" : ` · ${version}`}
              {current.complete ? "" : " · still writing"}
            </p>

            {prose && !source ? (
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-launch-ink bg-card p-4">
                {namedAs(current, MARKDOWN) ? (
                  <ChatMarkdown text={current.body} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {current.body}
                  </p>
                )}
              </div>
            ) : (
              <pre className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-launch-ink bg-ink p-3.5 font-mono text-[11px] leading-relaxed text-paper">
                {current.body}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
