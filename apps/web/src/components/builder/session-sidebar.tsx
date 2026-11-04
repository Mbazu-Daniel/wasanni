import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentProjectView, AgentSessionView } from "@/lib/agent-types";
import { PaneTitle } from "./pane-title.tsx";
import { ProjectHeader } from "./project-header.tsx";
import { SessionEntry } from "./session-entry.tsx";

export function SessionSidebar({
  sessionId,
  sessions,
  sessionsPending,
  projects,
  creatingProject,
  projectDraft,
  onProjectDraftChange,
  onNewProject,
  onCancelProject,
  onCreateProject,
  onNewSession,
  onSelect,
  onRenameSession,
  onTogglePin,
  onMoveSession,
  onDeleteSession,
  onNewSessionInProject,
  onRenameProject,
  onDeleteProject,
}: {
  sessionId: string | null;
  sessions: AgentSessionView[];
  sessionsPending: boolean;
  projects: AgentProjectView[];
  creatingProject: boolean;
  projectDraft: string;
  onProjectDraftChange: (value: string) => void;
  onNewProject: () => void;
  onCancelProject: () => void;
  onCreateProject: () => void;
  onNewSession: () => void;
  onSelect: (session: AgentSessionView) => void;
  onRenameSession: (session: AgentSessionView, title: string) => void;
  onTogglePin: (session: AgentSessionView) => void;
  onMoveSession: (session: AgentSessionView, projectId: string | null) => void;
  onDeleteSession: (session: AgentSessionView) => void;
  onNewSessionInProject: (project: AgentProjectView) => void;
  onRenameProject: (project: AgentProjectView, name: string) => void;
  onDeleteProject: (project: AgentProjectView) => void;
}) {
  const [sessionQuery, setSessionQuery] = React.useState("");
  const [collapsedProjects, setCollapsedProjects] = React.useState<Record<string, boolean>>({});

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
      onSelect={() => onSelect(session)}
      onRename={(title) => onRenameSession(session, title)}
      onTogglePin={() => onTogglePin(session)}
      onMove={(projectId) => onMoveSession(session, projectId)}
      onDelete={() => onDeleteSession(session)}
    />
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <PaneTitle>Sessions</PaneTitle>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={onNewProject}>
            <IconPlus />
            Project
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onNewSession}>
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
            onChange={(event) => onProjectDraftChange(event.target.value)}
            onBlur={onCreateProject}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreateProject();
              if (event.key === "Escape") onCancelProject();
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
                    onNewSession={() => onNewSessionInProject(project)}
                    onRename={(name) => onRenameProject(project, name)}
                    onDelete={() => onDeleteProject(project)}
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
    </>
  );
}
