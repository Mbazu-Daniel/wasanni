import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconPencil,
  IconPin,
  IconPaperclip,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { ChatMarkdown } from "@/components/primitives/chat-markdown";
import { ChatFileChip } from "@/components/primitives/chat-file-chip";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { apiFetch, ApiError } from "@/lib/api-client";
import { approveAgentRun, runAgent } from "@/lib/agent-run";
import { artifactView, segmentsOf } from "@/lib/agent-artifacts";
import type { ArtifactFile } from "@/lib/agent-artifacts";
import { buildIntegration } from "@/lib/agent-integration";
import { formatDuration, formatTokens, formatUsd } from "@/lib/format";
import { WAITING_WORDS } from "@/lib/waiting-words";
import type {
  AgentProviderView,
  AgentProjectView,
  AgentAttachment,
  AgentPendingApproval,
  AgentSessionView,
  AgentStreamEvent,
  AgentTurnView,
} from "@/lib/agent-types";
import type { GameView } from "@/lib/game-types";

export const Route = createFileRoute("/$orgSlug/agents/")({
  head: () => ({ meta: [{ title: "Builder · Wasanni" }] }),
  component: AgentsPage,
});

function PaneTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-launch-ink/68">
      {children}
    </p>
  );
}

type AgentMode = "agent" | "plan";

const AGENT_MODES: { value: AgentMode; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "plan", label: "Plan" },
];

function SessionEntry({
  session,
  active,
  projects,
  onSelect,
  onRename,
  onTogglePin,
  onMove,
  onDelete,
}: {
  session: AgentSessionView;
  active: boolean;
  projects: AgentProjectView[];
  onSelect: () => void;
  onRename: (title: string) => void;
  onTogglePin: () => void;
  onMove: (projectId: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(session.title);

  React.useEffect(() => {
    setTitle(session.title);
  }, [session.title]);

  const save = (): void => {
    const wanted = title.trim();
    setEditing(false);

    if (wanted === "" || wanted === session.title) {
      setTitle(session.title);
      return;
    }

    onRename(wanted);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setEditing(false);
            setTitle(session.title);
          }
        }}
        className="w-full rounded-lg border-2 border-launch-ink bg-card px-2 py-1.5 text-sm"
      />
    );
  }

  const iconButton = active
    ? "rounded p-1 text-paper/70 hover:bg-paper/10 hover:text-paper"
    : "rounded p-1 text-launch-ink/55 hover:bg-launch-ink/10 hover:text-launch-ink";

  return (
    <div
      className={
        active
          ? "group flex items-start gap-1 rounded-lg bg-ink px-2.5 py-2 text-paper"
          : "group flex items-start gap-1 rounded-lg px-2.5 py-2 hover:bg-launch-ink/[0.05]"
      }
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p
          className={
            active
              ? "mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60"
              : "mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-launch-ink/55"
          }
        >
          {session.runs} {session.runs === 1 ? "run" : "runs"} · {formatUsd(session.costMicros)}
        </p>
      </button>
      <div className="flex shrink-0 items-start gap-0.5">
        {projects.length > 0 && (
          <select
            aria-label={`Move ${session.title} to a project`}
            value={session.projectId ?? ""}
            onChange={(event) => onMove(event.target.value === "" ? null : event.target.value)}
            className={cn(
              "h-6 max-w-28 rounded-md border bg-transparent px-1 font-mono text-[10px] outline-none",
              active
                ? "border-paper/25 text-paper/80 [&_option]:text-foreground"
                : "border-launch-ink/20 text-launch-ink/70",
              "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
            )}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          aria-label={`${session.pinned ? "Unpin" : "Pin"} ${session.title}`}
          aria-pressed={session.pinned}
          onClick={onTogglePin}
          className={cn(
            "transition-opacity",
            iconButton,
            session.pinned
              ? "text-pink opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <IconPin size={13} />
        </button>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Rename ${session.title}`}
            onClick={() => setEditing(true)}
            className={iconButton}
          >
            <IconPencil size={13} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${session.title}`}
            onClick={onDelete}
            className={iconButton}
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectHeader({
  name,
  collapsed,
  count,
  onToggle,
  onRename,
  onDelete,
}: {
  name: string;
  collapsed: boolean;
  count: number;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(name);

  React.useEffect(() => {
    setDraftName(name);
  }, [name]);

  const save = (): void => {
    const wanted = draftName.trim();
    setEditing(false);

    if (wanted === "" || wanted === name) {
      setDraftName(name);
      return;
    }

    onRename(wanted);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setEditing(false);
            setDraftName(name);
          }
        }}
        className="mt-2 w-full rounded-lg border-2 border-launch-ink bg-card px-2 py-1 text-xs"
      />
    );
  }

  return (
    <div className="group mt-2.5 flex items-center gap-1 rounded-md px-1.5 py-1 first:mt-0 hover:bg-launch-ink/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex min-w-0 flex-1 items-center gap-1 text-left"
      >
        {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/70">
          {name}
        </p>
        <p className="font-mono text-[10px] text-launch-ink/40">{count}</p>
      </button>
      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label={`Rename ${name}`}
          onClick={() => setEditing(true)}
          className="rounded p-1 text-launch-ink/55 hover:bg-launch-ink/10 hover:text-launch-ink"
        >
          <IconPencil size={12} />
        </button>
        <button
          type="button"
          aria-label={`Delete ${name}`}
          onClick={onDelete}
          className="rounded p-1 text-launch-ink/55 hover:bg-launch-ink/10 hover:text-launch-ink"
        >
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="min-w-0 max-w-[80%] space-y-2">
        {segmentsOf(text).map((segment, index) => {
          if (segment.kind === "file") {
            return <ChatFileChip key={index} file={segment.file} />;
          }

          if (segment.value.trim() === "") {
            return null;
          }

          return (
            <p
              key={index}
              className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm border border-launch-ink/20 bg-launch-ink/[0.05] px-3.5 py-2.5 text-sm"
            >
              {segment.value.trim()}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function WaitingNote() {
  const [index, setIndex] = React.useState(() =>
    Math.floor(Math.random() * WAITING_WORDS.length),
  );

  React.useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % WAITING_WORDS.length),
      1500,
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm text-muted-foreground">{`${WAITING_WORDS[index] ?? "Waiting"}…`}</p>
  );
}

function TurnBubble({
  turn,
  showing,
  onShow,
  trimmedMessages,
  onOpenFile,
  onRegenerate,
}: {
  turn: AgentTurnView;
  showing: boolean;
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
        <button
          type="button"
          onClick={onShow}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink/70 hover:text-pink hover:underline"
        >
          {showing ? "shown in the pane" : "show artifact"}
        </button>
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

type TurnGroup = { prompt: AgentTurnView | null; answers: AgentTurnView[] };

const groupTurns = (turns: AgentTurnView[]): TurnGroup[] => {
  const groups: TurnGroup[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      groups.push({ prompt: turn, answers: [] });
      continue;
    }
    const current = groups[groups.length - 1];
    if (current === undefined) groups.push({ prompt: null, answers: [turn] });
    else current.answers.push(turn);
  }
  return groups;
};

const MARKDOWN = /\.(md|markdown)$/i;
const PROSE = /\.(md|markdown|txt|text)$/i;

const PREVIEW_WIDTHS = [
  { value: "fill", label: "Fill the pane" },
  { value: "phone", label: "Phone width" },
] as const;

type PreviewWidth = (typeof PREVIEW_WIDTHS)[number]["value"];

const namedAs = (file: ArtifactFile, pattern: RegExp): boolean =>
  pattern.test(file.name) || pattern.test(`.${file.language}`);

function ArtifactPane({
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
  onSelect: (name: string) => void;
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
                  onClick={() => onSelect(entry.name)}
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

const summaryOf = (args: unknown): string => {
  if (typeof args !== "object" || args === null) return "";

  return Object.entries(args)
    .map(([key, value]) =>
      typeof value === "string" && value.length > 80
        ? `${key}: ${value.length} characters`
        : `${key}: ${String(value)}`,
    )
    .join("\n");
};

function ApprovalRow({
  approval,
  gameName,
  onDecide,
}: {
  approval: AgentPendingApproval;
  gameName: string | null;
  onDecide: (approved: boolean) => void;
}) {
  const summary = summaryOf(approval.args);

  return (
    <div className="min-w-0 rounded-2xl border-2 border-pink bg-card px-3.5 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink">Approval</p>
      <p className="mt-1 text-sm">
        Allow <span className="font-mono">{approval.tool}</span>
        {gameName === null ? "" : ` on ${gameName}`}?
      </p>
      {summary !== "" && (
        <p className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-launch-ink/70">
          {summary}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => onDecide(true)}>
          Allow
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDecide(false)}>
          Deny
        </Button>
      </div>
    </div>
  );
}

function AgentsPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [live, setLive] = React.useState<{
    prompt: string | null;
    answer: string;
    thinking: string;
  } | null>(null);
  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [providerId, setProviderId] = React.useState("");
  const [mode, setMode] = React.useState<AgentMode>("agent");
  const [attachments, setAttachments] = React.useState<AgentAttachment[]>([]);
  const [lastSent, setLastSent] = React.useState<{
    prompt: string;
    attachments: AgentAttachment[];
    mode: AgentMode;
  } | null>(null);
  const [sessionQuery, setSessionQuery] = React.useState("");
  const [collapsedProjects, setCollapsedProjects] = React.useState<Record<string, boolean>>({});
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [projectDraft, setProjectDraft] = React.useState("");
  const [pinned, setPinned] = React.useState<string | null>(null);
  const [pane, setPane] = React.useState("preview");
  const [artifactFile, setArtifactFile] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<AgentSessionView | null>(null);
  const [gameId, setGameId] = React.useState("");
  const [trimmedMessages, setTrimmedMessages] = React.useState(0);
  const [pending, setPending] = React.useState<AgentPendingApproval | null>(null);
  const [failure, setFailure] = React.useState<{
    prompt: string | null;
    answer: string;
    code: string;
    message: string;
    retryable: boolean;
    retry: (() => Promise<void>) | null;
  } | null>(null);

  const endRef = React.useRef<HTMLDivElement | null>(null);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abort.current?.abort(), []);

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["agents", organizationId] });
  };

  const { data: providers = [] } = useQuery({
    queryKey: ["agents", organizationId, "providers"],
    queryFn: () =>
      apiFetch<{ providers: AgentProviderView[] }>(
        `/api/v1/organizations/${organizationId}/agents/providers`,
      ).then((response) => response.providers),
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameView[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) => response.games),
  });

  const { data: sessions = [], isPending: sessionsPending } = useQuery({
    queryKey: ["agents", organizationId, "sessions"],
    queryFn: () =>
      apiFetch<{ sessions: AgentSessionView[] }>(
        `/api/v1/organizations/${organizationId}/agents/sessions`,
      ).then((response) => response.sessions),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["agents", organizationId, "projects"],
    queryFn: () =>
      apiFetch<{ projects: AgentProjectView[] }>(
        `/api/v1/organizations/${organizationId}/agents/projects`,
      ).then((response) => response.projects),
  });

  const { data: turns = [], isPending: turnsPending } = useQuery({
    queryKey: ["agents", organizationId, "session", sessionId],
    queryFn: () =>
      apiFetch<{ turns: AgentTurnView[] }>(
        `/api/v1/organizations/${organizationId}/agents/sessions/${sessionId}/messages`,
      ).then((response) => response.turns),
    enabled: sessionId !== null,
  });

  const { data: waiting = [] } = useQuery({
    queryKey: ["agents", organizationId, "session", sessionId, "approvals"],
    queryFn: () =>
      apiFetch<{ pending: AgentPendingApproval[] }>(
        `/api/v1/organizations/${organizationId}/agents/sessions/${sessionId}/approvals`,
      ).then((response) => response.pending),
    enabled: sessionId !== null,
  });

  const approval = running ? pending : (pending ?? waiting[0] ?? null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length, live?.answer]);

  const chosen =
    providers.find((provider) => provider.id === providerId) ??
    providers.find((provider) => provider.isDefault) ??
    providers[0] ??
    null;

  const runLeg = async (leg: {
    prompt: string | null;
    retry: (() => Promise<void>) | null;
    run: (
      onEvent: (event: AgentStreamEvent) => void,
      signal: AbortSignal,
    ) => Promise<void>;
  }): Promise<void> => {
    abort.current = new AbortController();
    setRunning(true);
    setLive({ prompt: leg.prompt, answer: "", thinking: "" });
    setThinkingOpen(true);
    setPinned(null);
    setTrimmedMessages(0);
    setPending(null);
    setFailure(null);

    let partial = "";

    const onEvent = (event: AgentStreamEvent): void => {
      if (event.kind === "delta") {
        partial += event.text;
        setThinkingOpen(false);
        setLive((current) =>
          current === null ? current : { ...current, answer: current.answer + event.text },
        );
        return;
      }

      if (event.kind === "thinking") {
        setLive((current) =>
          current === null ? current : { ...current, thinking: current.thinking + event.text },
        );
        return;
      }

      if (event.kind === "tool") {
        return;
      }

      if (event.kind === "approval") {
        setPending({
          agentRunId: event.agentRunId,
          callId: event.callId,
          tool: event.tool,
          args: event.args,
        });
        return;
      }

      if (event.kind === "done") {
        setSessionId(event.sessionId);
        setTrimmedMessages(event.trimmedMessages);
        return;
      }

      setFailure({
        prompt: leg.prompt,
        answer: partial,
        code: event.code,
        message: event.message,
        retryable: event.retryable,
        retry: leg.retry,
      });
    };

    try {
      await leg.run(onEvent, abort.current.signal);
    } catch (error) {
      setFailure({
        prompt: leg.prompt,
        answer: partial,
        code: error instanceof ApiError ? error.code : "provider_unreachable",
        message: error instanceof Error ? error.message : "The run failed",
        retryable: !(error instanceof ApiError),
        retry: leg.retry,
      });
    } finally {
      setRunning(false);
      setLive(null);
      setAttachments([]);
      refresh();
    }
  };

  const send = async (
    retry?: { prompt: string; attachments: AgentAttachment[] },
    forced?: AgentMode,
  ): Promise<void> => {
    const prompt = (retry?.prompt ?? draft).trim();
    const files = retry?.attachments ?? attachments;
    if (prompt === "" || running) return;
    const useMode = forced ?? mode;
    setDraft("");
    setLastSent({ prompt, attachments: files, mode: useMode });

    await runLeg({
      prompt,
      retry: () => send({ prompt, attachments: files }, useMode),
      run: (onEvent, signal) =>
        runAgent({
          organizationId,
          prompt,
          ...(sessionId === null ? {} : { sessionId }),
          ...(sessionId === null && gameId === "" ? {} : { gameId }),
          ...(chosen === null ? {} : { providerId: chosen.id }),
          mode: useMode,
          ...(files.length === 0 ? {} : { attachments: files }),
          signal,
          onEvent,
        }),
    });
  };

  const startIntegration = (file: ArtifactFile | null): void => {
    const request = buildIntegration({ file, attachments });
    if (request === null) return;
    void send(request, "plan");
  };

  const runPlan = (): void => {
    const sent = lastSent;
    if (sent === null || running) return;
    void send({ prompt: sent.prompt, attachments: sent.attachments }, "agent");
  };

  const decide = async (approved: boolean): Promise<void> => {
    if (pending === null || sessionId === null) return;

    const call = pending;

    await runLeg({
      prompt: null,
      retry: null,
      run: (onEvent, signal) =>
        approveAgentRun({
          organizationId,
          sessionId,
          agentRunId: call.agentRunId,
          callId: call.callId,
          approved,
          signal,
          onEvent,
        }),
    });
  };

  const addAttachments = async (files: FileList | null): Promise<void> => {
    if (files === null) return;

    const incoming = Array.from(files).slice(0, 8 - attachments.length);
    const loaded = await Promise.all(
      incoming.map(
        (file) =>
          new Promise<AgentAttachment>((resolve, reject) => {
            if (file.size > 6_000_000) {
              reject(new Error(`${file.name} is larger than 6 MB`));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              const value = typeof reader.result === "string" ? reader.result : "";
              const data = value.split(",", 2)[1] ?? "";
              resolve({
                name: file.name,
                mediaType: file.type || "application/octet-stream",
                data,
              });
            };
            reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
            reader.readAsDataURL(file);
          }),
      ),
    ).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not add the files");
      return [];
    });

    setAttachments((current) => [...current, ...loaded]);
  };

  const start = (): void => {
    setSessionId(null);
    setPinned(null);
    setDraft("");
    setGameId("");
    setTrimmedMessages(0);
    setPending(null);
    setLastSent(null);
  };

  const regenerate = (): void => {
    const sent = lastSent;
    if (sent === null || running) return;
    void send({ prompt: sent.prompt, attachments: sent.attachments }, sent.mode);
  };

  const rename = async (session: AgentSessionView, title: string): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/sessions/${session.id}`,
        { method: "PATCH", data: { title } },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the session");
    }
  };

  const togglePin = async (session: AgentSessionView): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/sessions/${session.id}`,
        { method: "PATCH", data: { pinned: !session.pinned } },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not pin the session");
    }
  };

  const remove = async (session: AgentSessionView): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/sessions/${session.id}`,
        { method: "DELETE" },
      );
      if (session.id === sessionId) start();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the session");
    }
  };

  const addProject = async (): Promise<void> => {
    const name = projectDraft.trim();
    setCreatingProject(false);
    setProjectDraft("");

    if (name === "") return;

    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/agents/projects`, {
        method: "POST",
        data: { name },
      });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the project");
    }
  };

  const renameProject = async (project: AgentProjectView, name: string): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/projects/${project.id}`,
        { method: "PATCH", data: { name } },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the project");
    }
  };

  const dropProject = async (project: AgentProjectView): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/projects/${project.id}`,
        { method: "DELETE" },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the project");
    }
  };

  const moveSession = async (
    session: AgentSessionView,
    projectId: string | null,
  ): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/sessions/${session.id}`,
        { method: "PATCH", data: { projectId } },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the session");
    }
  };

  const lastAssistant =
    [...turns].reverse().find((turn) => turn.role === "assistant") ?? null;
  const shownTurn =
    pinned === null ? lastAssistant : (turns.find((turn) => turn.id === pinned) ?? null);

  const artifact = React.useMemo(
    () => artifactView(live?.answer ?? null, shownTurn?.text ?? ""),
    [live?.answer, shownTurn?.text],
  );

  React.useEffect(() => {
    setPane(artifact.drafting ? "code" : "preview");
  }, [artifact.drafting]);

  const openFile = (file: ArtifactFile): void => {
    setArtifactFile(file.name);
    setPane(file.language === "html" || file.name.toLowerCase().endsWith(".html") ? "preview" : "code");
  };

  const answers = turns.filter((turn) => turn.role === "assistant");
  const answerNumber =
    shownTurn === null ? 0 : answers.findIndex((turn) => turn.id === shownTurn.id) + 1;

  const artifactVersion =
    live !== null
      ? "writing now"
      : answerNumber > 0
        ? `answer ${answerNumber} of ${answers.length}`
        : null;

  const sessionGame = games.find(
    (game) => game.id === sessions.find((session) => session.id === sessionId)?.gameId,
  );
  const approvalGame =
    sessionGame ?? games.find((game) => game.id === gameId) ?? null;

  const wanted = sessionQuery.trim().toLowerCase();
  const visibleSessions =
    wanted === ""
      ? sessions
      : sessions.filter((session) => session.title.toLowerCase().includes(wanted));

  const renderSession = (session: AgentSessionView) => (
    <SessionEntry
      key={session.id}
      session={session}
      projects={projects}
      active={session.id === sessionId}
      onSelect={() => {
        setSessionId(session.id);
        setPinned(null);
        setLastSent(null);
      }}
      onRename={(title) => void rename(session, title)}
      onTogglePin={() => void togglePin(session)}
      onMove={(projectId) => void moveSession(session, projectId)}
      onDelete={() => setConfirming(session)}
    />
  );

  if (org === null) return null;

  return (
    <ResizablePanelGroup className="h-full">
      <ResizablePanel index={0} className="flex min-h-[180px] flex-col border-b-2 border-launch-ink/85 lg:min-h-0 lg:border-b-0 lg:border-r-2">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
          <PaneTitle>Sessions</PaneTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreatingProject(true)}
            >
              <IconPlus />
              Project
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={start}>
              <IconPlus />
              New
            </Button>
          </div>
        </div>

        {sessions.length > 6 && (
          <input
            value={sessionQuery}
            onChange={(event) => setSessionQuery(event.target.value)}
            placeholder="Filter sessions"
            aria-label="Filter sessions"
            className="mx-3 mb-1 h-7 rounded-lg border border-input bg-ink/[0.04] px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {sessionsPending && <Skeleton className="h-12 rounded-lg" />}

          {!sessionsPending && sessions.length === 0 && (
            <p className="px-1.5 text-xs text-muted-foreground">
              No session yet. The first prompt starts one.
            </p>
          )}

          {!sessionsPending && sessions.length > 0 && visibleSessions.length === 0 && (
            <p className="px-1.5 text-xs text-muted-foreground">
              {`No session titled "${sessionQuery.trim()}"`}
            </p>
          )}

          {creatingProject && (
            <input
              autoFocus
              value={projectDraft}
              placeholder="Project name"
              aria-label="New project name"
              onChange={(event) => setProjectDraft(event.target.value)}
              onBlur={() => void addProject()}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addProject();
                if (event.key === "Escape") {
                  setCreatingProject(false);
                  setProjectDraft("");
                }
              }}
              className="w-full rounded-lg border-2 border-launch-ink bg-card px-2 py-1.5 text-sm"
            />
          )}

          {projects.length === 0 && visibleSessions.map(renderSession)}

          {projects.length > 0 && (
            <>
              {projects.map((project) => {
                const members = visibleSessions.filter(
                  (session) => session.projectId === project.id,
                );
                const collapsed = collapsedProjects[project.id] ?? false;

                return (
                  <div key={project.id} className="space-y-1">
                    <ProjectHeader
                      name={project.name}
                      collapsed={collapsed}
                      count={members.length}
                      onToggle={() =>
                        setCollapsedProjects((current) => ({
                          ...current,
                          [project.id]: !collapsed,
                        }))
                      }
                      onRename={(name) => void renameProject(project, name)}
                      onDelete={() => void dropProject(project)}
                    />
                    {!collapsed && members.map(renderSession)}
                  </div>
                );
              })}

              {visibleSessions.some((session) => session.projectId === null) && (
                <div className="space-y-1">
                  <p className="mt-2.5 px-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/50">
                    No project
                  </p>
                  {visibleSessions
                    .filter((session) => session.projectId === null)
                    .map(renderSession)}
                </div>
              )}
            </>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle index={0} />

      <ResizablePanel index={1} className="flex min-h-[420px] flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-pink">
            <IconRobot size={14} /> {sessionId === null ? "New chat" : "Conversation"}
          </p>
          {sessionId !== null && sessionGame !== undefined && (
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-launch-ink/55">
              game · {sessionGame.name}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5">
            {turnsPending && sessionId !== null && <Skeleton className="h-24 rounded-2xl" />}

            {sessionId === null && live === null && (
              <div className="grid flex-1 place-items-center">
                <div className="max-w-md text-center">
                  <h1 className="font-poster text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                    Your models, <span className="text-pink">your key</span>
                  </h1>
                  <p className="mt-2 text-sm text-launch-ink/70">
                    Ask for a game, a page, or an answer. Anything the model writes as code
                    renders on the right.
                  </p>
                  {providers.length === 0 && (
                    <p className="mt-4 text-sm">
                      No provider in this workspace yet.{" "}
                      <Link
                        to="/$orgSlug/settings/providers"
                        params={{ orgSlug: org.slug }}
                        className="font-medium text-pink underline"
                      >
                        Add one in Settings
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            )}

            {groupTurns(turns).map((group, groupIndex) => (
              <div
                key={group.prompt?.id ?? group.answers[0]?.id ?? groupIndex}
                className="flex min-w-0 flex-col gap-3"
              >
                {group.prompt !== null && <UserBubble text={group.prompt.text} />}
                {group.answers.map((turn) => (
                  <TurnBubble
                    key={turn.id}
                    turn={turn}
                    trimmedMessages={turn.runId === lastAssistant?.runId ? trimmedMessages : 0}
                    showing={shownTurn?.id === turn.id}
                    onShow={() => setPinned(turn.id)}
                    onOpenFile={openFile}
                    onRegenerate={
                      turn.id === lastAssistant?.id && lastSent !== null
                        ? regenerate
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}

            {live !== null && (
              <div className="flex min-w-0 flex-col gap-3">
                {live.prompt !== null && <UserBubble text={live.prompt} />}
                <div className="min-w-0 px-1">
                  {live.thinking !== "" && (
                    <details
                      open={thinkingOpen}
                      onToggle={(event) => setThinkingOpen(event.currentTarget.open)}
                      className="mb-2.5 rounded-xl border border-dashed border-blue/40 bg-blue/10 px-3 py-2"
                    >
                      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-blue">
                        Thinking
                      </summary>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <ChatMarkdown text={live.thinking} />
                      </div>
                    </details>
                  )}
                  {live.answer === "" ? (
                    live.thinking === "" && <WaitingNote />
                  ) : (
                    <ChatMarkdown text={live.answer} onOpenFile={openFile} />
                  )}
                </div>
              </div>
            )}

            {failure !== null && (
              <div className="flex min-w-0 flex-col gap-3">
                {failure.prompt !== null && <UserBubble text={failure.prompt} />}
                {failure.answer !== "" && (
                  <div className="min-w-0 px-1">
                    <ChatMarkdown text={failure.answer} />
                  </div>
                )}
                <div className="rounded-2xl border border-dashed border-destructive px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-destructive">
                    {failure.code}
                  </p>
                  <p className="mt-1 text-sm break-words">{failure.message}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {failure.retryable && failure.retry !== null && (
                      <button
                        type="button"
                        onClick={() => void failure.retry?.()}
                        className="rounded-full border border-launch-ink/30 px-2.5 py-1 text-xs font-medium hover:bg-launch-ink/5"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFailure(null)}
                      className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {approval !== null && (
              <ApprovalRow
                approval={approval}
                gameName={approvalGame?.name ?? null}
                onDecide={(approved) => void decide(approved)}
              />
            )}

            <div ref={endRef} />
          </div>
        </div>

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
                      onClick={() => setAttachments((current) => current.filter((_, item) => item !== index))}
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
                  disabled={providers.length === 0 || approval !== null}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && running) {
                      event.preventDefault();
                      abort.current?.abort();
                      return;
                    }
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey || !event.shiftKey)
                    ) {
                      event.preventDefault();
                      void send();
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
                      void addAttachments(event.target.files);
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
                      onClick={() => startIntegration(null)}
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
                        onClick={() => setMode(entry.value)}
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
                  {sessionId === null && games.length > 0 && (
                    <SearchableSelect
                      compact
                      className="w-40 shrink-0"
                      value={gameId}
                      onValueChange={setGameId}
                      placeholder="No game"
                      options={games.map((game) => ({
                        value: game.id,
                        label: `${game.name} · ${game.hosting}`,
                      }))}
                    />
                  )}

                  <div className="ml-auto flex items-center gap-1.5">
                    {running ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => abort.current?.abort()}
                      >
                        <IconPlayerStop />
                        Stop
                      </Button>
                    ) : (
                      <>
                        {lastSent?.mode === "plan" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={runPlan}
                            disabled={providers.length === 0}
                          >
                            Run this plan
                          </Button>
                        )}
                        {draft.trim() !== "" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void send()}
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
                    to="/$orgSlug/settings/providers"
                    params={{ orgSlug: org.slug }}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink hover:underline"
                  >
                    add a provider
                  </Link>
                ) : (
                  <SearchableSelect
                    compact
                    className="w-60 shrink-0"
                    value={chosen?.id ?? ""}
                    onValueChange={setProviderId}
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
      </ResizablePanel>

      <ResizableHandle index={1} />

      <ResizablePanel index={2} className="flex min-h-[280px] flex-col border-t-2 border-launch-ink/85 lg:min-h-0 lg:border-l-2 lg:border-t-0">
        <ArtifactPane
          pane={pane}
          onPaneChange={setPane}
          html={artifact.html}
          files={artifact.files}
          selectedName={artifactFile}
          onSelect={setArtifactFile}
          version={artifactVersion}
          onIntegrate={(file) => startIntegration(file)}
        />
      </ResizablePanel>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Delete this session?"
        description={
          confirming === null
            ? undefined
            : `${confirming.title} and its ${confirming.runs} runs stay billed to this workspace.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirming !== null) void remove(confirming);
          setConfirming(null);
        }}
      />
    </ResizablePanelGroup>
  );
}
