import * as React from "react";
import { IconPencil, IconPin, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import type { AgentProjectView, AgentSessionView } from "@/lib/agent-types";

export function SessionEntry({
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
  const [titleEdit, setTitleEdit] = React.useState<string | null>(null);

  const title = titleEdit ?? session.title;

  const startEdit = (): void => {
    setTitleEdit(session.title);
    setEditing(true);
  };

  const save = (): void => {
    const wanted = title.trim();
    setEditing(false);
    setTitleEdit(null);

    if (wanted === "" || wanted === session.title) return;

    onRename(wanted);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitleEdit(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setEditing(false);
            setTitleEdit(null);
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
            onClick={startEdit}
            className={iconButton}
          >
            <IconPencil size={13} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${session.title}`}
            onClick={onDelete}
            className="rounded p-1 text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
