export type {
  AgentAttachment,
  AgentPendingApproval,
  AgentProjectView,
  AgentProviderView,
  AgentRunMode,
  AgentRunView,
  AgentSessionView,
  AgentSpendView,
  AgentSpecModel,
  AgentSpecView,
  AgentTurnView,
} from "@wasanni/contracts";

export type AgentStreamEvent =
  | { kind: "delta"; text: string; step: number }
  | { kind: "thinking"; text: string; step: number }
  | { kind: "tool"; tool: string; state: "call" | "result"; ok: boolean }
  | {
      kind: "approval";
      agentRunId: string;
      callId: string;
      tool: string;
      args: unknown;
    }
  | {
      kind: "done";
      runId: string;
      sessionId: string;
      model: string;
      costMicros: number;
      promptTokens: number;
      completionTokens: number;
      durationMs: number;
      trimmedMessages: number;
    }
  | {
      kind: "error";
      code:
        | "rate_limited"
        | "provider_refused_request"
        | "provider_key_rejected"
        | "provider_unreachable"
        | "provider_timed_out"
        | "provider_unknown"
        | "request_refused";
      message: string;
      retryable: boolean;
    };
