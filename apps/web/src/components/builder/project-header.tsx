import * as React from "react";
import { IconChevronDown, IconChevronRight, IconPencil, IconTrash } from "@tabler/icons-react";

export function ProjectHeader({
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
  const [draftNameEdit, setDraftNameEdit] = React.useState<string | null>(null);

  const draftName = draftNameEdit ?? name;

  const startEdit = (): void => {
    setDraftNameEdit(name);
    setEditing(true);
  };

  const save = (): void => {
    const wanted = draftName.trim();
    setEditing(false);
    setDraftNameEdit(null);

    if (wanted === "" || wanted === name) return;

    onRename(wanted);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draftName}
        onChange={(event) => setDraftNameEdit(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setEditing(false);
            setDraftNameEdit(null);
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
          onClick={startEdit}
          className="rounded p-1 text-launch-ink/55 hover:bg-launch-ink/10 hover:text-launch-ink"
        >
          <IconPencil size={12} />
        </button>
        <button
          type="button"
          aria-label={`Delete ${name}`}
          onClick={onDelete}
          className="rounded p-1 text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
        >
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
}
