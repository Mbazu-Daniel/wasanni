import type { AgentMode } from "./types.ts";

export const AGENT_MODES: { value: AgentMode; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "plan", label: "Plan" },
];

export const PREVIEW_WIDTHS = [
  { value: "fill", label: "Fill the pane" },
  { value: "phone", label: "Phone width" },
] as const;

export type PreviewWidth = (typeof PREVIEW_WIDTHS)[number]["value"];

export const MARKDOWN = /\.(md|markdown)$/i;

export const PROSE = /\.(md|markdown|txt|text)$/i;
