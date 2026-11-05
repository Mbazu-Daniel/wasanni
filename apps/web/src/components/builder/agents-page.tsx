import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { approveAgentRun, runAgent } from "@/lib/agent-run";
import { artifactView, type ArtifactFile } from "@/lib/agent-artifacts";
import { buildIntegration } from "@/lib/agent-integration";
import type {
  AgentAttachment,
  AgentPendingApproval,
  AgentProjectView,
  AgentProviderView,
  AgentSessionView,
  AgentStreamEvent,
  AgentTurnView,
} from "@/lib/agent-types";
import type { GameFileView } from "@wasanni/contracts";
import type { GameView } from "@/lib/game-types";
import { ArtifactPane } from "./artifact-pane.tsx";
import { Composer } from "./composer.tsx";
import { ConversationPane } from "./conversation-pane.tsx";
import { SessionSidebar } from "./session-sidebar.tsx";
import type { AgentFailure, AgentMode, LiveReply, SentPrompt } from "./types.ts";

type BuilderOrg = { id: string; slug: string };

export function AgentsPage({ org }: { org: BuilderOrg }) {
  const organizationId = org.id;
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [pendingGameId, setPendingGameId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [live, setLive] = React.useState<LiveReply | null>(null);
  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [providerId, setProviderId] = React.useState("");
  const [mode, setMode] = React.useState<AgentMode>("agent");
  const [attachments, setAttachments] = React.useState<AgentAttachment[]>([]);
  const [lastSent, setLastSent] = React.useState<SentPrompt | null>(null);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [projectDraft, setProjectDraft] = React.useState("");
  const [pinned, setPinned] = React.useState<string | null>(null);
  const [paneChoice, setPaneChoice] = React.useState<"code" | "preview" | null>(null);
  const [artifactFile, setArtifactFile] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<AgentSessionView | null>(null);
  const [pending, setPending] = React.useState<AgentPendingApproval | null>(null);
  const [failure, setFailure] = React.useState<AgentFailure | null>(null);

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

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: { id: string; name: string }[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
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
          ...(sessionId === null && pendingGameId !== null ? { gameId: pendingGameId } : {}),
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

  const bindGame = async (gameId: string | null): Promise<void> => {
    if (sessionId === null) {
      setPendingGameId(gameId);
      setArtifactFile(null);
      return;
    }

    setArtifactFile(null);

    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/sessions/${sessionId}`,
        { method: "PATCH", data: { gameId } },
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not bind the game");
    }
  };

  const start = (): void => {
    setSessionId(null);
    setPendingGameId(null);
    setPinned(null);
    setDraft("");
    setPending(null);
    setLastSent(null);
  };

  const startInProject = async (project: AgentProjectView): Promise<void> => {
    const boundGameId = pendingGameId;
    start();

    try {
      const created = await apiFetch<AgentSessionView>(
        `/api/v1/organizations/${organizationId}/agents/sessions`,
        {
          method: "POST",
          data: {
            projectId: project.id,
            ...(boundGameId === null ? {} : { gameId: boundGameId }),
          },
        },
      );
      setSessionId(created.id);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the session");
    }
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

  const activeSession = sessions.find((session) => session.id === sessionId) ?? null;
  const selectedGameId = sessionId === null ? pendingGameId : (activeSession?.gameId ?? null);
  const sessionGame = games.find((game) => game.id === selectedGameId);

  const { data: boundBuild = null } = useQuery({
    queryKey: ["games", organizationId, selectedGameId, "current-build"],
    queryFn: async (): Promise<{ version: string; name: string; body: string } | null> => {
      if (selectedGameId === null) return null;

      const { files } = await apiFetch<{ files: GameFileView[] }>(
        `/api/v1/organizations/${organizationId}/games/${selectedGameId}/files`,
      );
      const current = files.find(
        (file) => file.isCurrent && file.status === "ready" && file.kind === "single",
      );

      if (current === undefined || current.sizeBytes > 2_000_000) return null;

      const { url } = await apiFetch<{ url: string }>(
        `/api/v1/organizations/${organizationId}/games/${selectedGameId}/files/${current.id}/download-url`,
      );
      const response = await fetch(url);

      if (!response.ok) return null;

      return { version: current.version, name: current.entryPoint, body: await response.text() };
    },
    enabled: selectedGameId !== null,
    staleTime: 30_000,
  });

  const { artifact, showingBuild } = React.useMemo(() => {
    const fromChat = artifactView(live?.answer ?? null, shownTurn?.text ?? "");

    if (fromChat.files.length > 0 || fromChat.html !== null || boundBuild === null) {
      return { artifact: fromChat, showingBuild: false };
    }

    const file = { name: boundBuild.name, language: "html", body: boundBuild.body, complete: true };

    return {
      artifact: { html: boundBuild.body, files: [file], drafting: false },
      showingBuild: true,
    };
  }, [live?.answer, shownTurn?.text, boundBuild]);

  const pane = paneChoice ?? (artifact.drafting ? "code" : "preview");

  const openFile = (file: ArtifactFile): void => {
    setArtifactFile(file.name);
    setPaneChoice(
      file.language === "html" || file.name.toLowerCase().endsWith(".html")
        ? "preview"
        : "code",
    );
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

  const shownVersion = showingBuild && boundBuild !== null ? `build ${boundBuild.version}` : artifactVersion;

  return (
    <ResizablePanelGroup className="h-full">
      <ResizablePanel index={0} className="flex min-h-[180px] flex-col border-b-2 border-launch-ink/85 lg:min-h-0 lg:border-b-0 lg:border-r-2">
        <SessionSidebar
          sessionId={sessionId}
          sessions={sessions}
          sessionsPending={sessionsPending}
          projects={projects}
          creatingProject={creatingProject}
          projectDraft={projectDraft}
          onProjectDraftChange={setProjectDraft}
          onNewProject={() => setCreatingProject(true)}
          onCancelProject={() => {
            setCreatingProject(false);
            setProjectDraft("");
          }}
          onCreateProject={() => void addProject()}
          onNewSession={start}
          onSelect={(session) => {
            setSessionId(session.id);
            setPendingGameId(null);
            setPinned(null);
            setLastSent(null);
          }}
          onRenameSession={(session, title) => void rename(session, title)}
          onTogglePin={(session) => void togglePin(session)}
          onMoveSession={(session, projectId) => void moveSession(session, projectId)}
          onDeleteSession={setConfirming}
          onNewSessionInProject={(project) => void startInProject(project)}
          onRenameProject={(project, name) => void renameProject(project, name)}
          onDeleteProject={(project) => void dropProject(project)}
        />
      </ResizablePanel>

      <ResizableHandle index={0} />

      <ResizablePanel index={1} className="flex min-h-[420px] flex-col">
        <ConversationPane
          orgSlug={org.slug}
          sessionId={sessionId}
          games={games}
          platforms={platforms}
          selectedGameId={selectedGameId}
          onGameChange={(gameId) => void bindGame(gameId)}
          hasProviders={providers.length > 0}
          providers={providers}
          chosenProviderId={chosen?.id ?? ""}
          onProviderChange={setProviderId}
          turns={turns}
          turnsPending={turnsPending}
          live={live}
          thinkingOpen={thinkingOpen}
          onThinkingOpenChange={setThinkingOpen}
          failure={failure}
          onDismissFailure={() => setFailure(null)}
          approval={approval}
          approvalGameName={sessionGame?.name ?? null}
          onDecide={(approved) => void decide(approved)}
          shownTurnId={shownTurn?.id ?? null}
          lastAssistantId={lastAssistant?.id ?? null}
          canRegenerate={lastSent !== null}
          onRegenerate={regenerate}
          onShowTurn={(turn) => setPinned(turn.id)}
          onOpenFile={openFile}
          endRef={endRef}
        />

        <Composer
          orgSlug={org.slug}
          draft={draft}
          onDraftChange={setDraft}
          attachments={attachments}
          onRemoveAttachment={(index) =>
            setAttachments((current) => current.filter((_, item) => item !== index))
          }
          onAddAttachments={(files) => void addAttachments(files)}
          onStartIntegration={() => startIntegration(null)}
          mode={mode}
          onModeChange={setMode}
          running={running}
          onStop={() => abort.current?.abort()}
          onSend={() => void send()}
          onRunPlan={runPlan}
          lastSentMode={lastSent?.mode ?? null}
          providers={providers}
          approvalPending={approval !== null}
        />
      </ResizablePanel>

      <ResizableHandle index={1} />

      <ResizablePanel index={2} className="flex min-h-[280px] flex-col border-t-2 border-launch-ink/85 lg:min-h-0 lg:border-l-2 lg:border-t-0">
        <ArtifactPane
          pane={pane}
          onPaneChange={(next) =>
            setPaneChoice(next === "code" ? "code" : "preview")
          }
          html={artifact.html}
          files={artifact.files}
          selectedName={artifactFile}
          onSelect={openFile}
          version={shownVersion}
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
