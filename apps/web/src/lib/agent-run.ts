import { apiBaseURL } from "./auth-client";
import { ApiError } from "./api-client";
import type { AgentAttachment, AgentRunMode, AgentStreamEvent } from "./agent-types";

type ErrorPayload = { error?: { code?: string; message?: string } };

const stream = async (
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  onEvent: (event: AgentStreamEvent) => void,
): Promise<void> => {
  const response = await fetch(`${apiBaseURL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || response.body === null) {
    const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

    throw new ApiError(
      response.status,
      payload?.error?.code ?? "network_error",
      payload?.error?.message ?? `the run stopped with ${response.status}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;

    buffer += decoder.decode(chunk.value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      if (!block.startsWith("data: ")) continue;
      let event: AgentStreamEvent;
      try {
        event = JSON.parse(block.slice(6)) as AgentStreamEvent;
      } catch {
        throw new Error("the agent stream returned invalid data");
      }
      onEvent(event);
    }
  }
};

export async function runAgent(input: {
  organizationId: string;
  prompt: string;
  providerId?: string;
  sessionId?: string;
  gameId?: string;
  mode?: AgentRunMode;
  attachments?: AgentAttachment[];
  signal: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
}): Promise<void> {
  await stream(
    `/api/v1/organizations/${input.organizationId}/agents/run`,
    {
      prompt: input.prompt,
      providerId: input.providerId,
      sessionId: input.sessionId,
      gameId: input.gameId,
      mode: input.mode,
      attachments: input.attachments,
    },
    input.signal,
    input.onEvent,
  );
}

export async function approveAgentRun(input: {
  organizationId: string;
  sessionId: string;
  agentRunId: string;
  callId: string;
  approved: boolean;
  signal: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
}): Promise<void> {
  await stream(
    `/api/v1/organizations/${input.organizationId}/agents/sessions/${input.sessionId}/approvals`,
    { agentRunId: input.agentRunId, callId: input.callId, approved: input.approved },
    input.signal,
    input.onEvent,
  );
}
