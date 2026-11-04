import type { AgentAttachment, AgentTurnView } from "@/lib/agent-types";

export type AgentMode = "agent" | "plan";

export type TurnGroup = { prompt: AgentTurnView | null; answers: AgentTurnView[] };

export type LiveReply = {
  prompt: string | null;
  answer: string;
  thinking: string;
};

export type SentPrompt = {
  prompt: string;
  attachments: AgentAttachment[];
  mode: AgentMode;
};

export type AgentFailure = {
  prompt: string | null;
  answer: string;
  code: string;
  message: string;
  retryable: boolean;
  retry: (() => Promise<void>) | null;
};
