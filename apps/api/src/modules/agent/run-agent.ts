import { Agent } from "@mastra/core/agent";
import { StreamErrorRetryProcessor, TokenLimiterProcessor } from "@mastra/core/processors";
import { RequestContext } from "@mastra/core/request-context";
import { createTool } from "@mastra/core/tools";
import type { MastraModelOutput } from "@mastra/core/stream";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AgentPendingApproval, RunAgentBody } from "@wasanni/contracts";
import { assertSafeOutboundUrl } from "@wasanni/kit";
import {
  DEFAULT_REQUEST_TOKEN_LIMIT,
  MAX_AGENT_STEPS,
  RUN_TIMEOUT_MS,
} from "./constants.ts";
import type { AgentRuntime } from "./mastra.ts";
import { historyCompat } from "./provider-compat.ts";
import type { ProviderEndpoint } from "./transport.ts";
import type { RunEvent } from "./types.ts";

export type AgentTool = ReturnType<typeof createTool>;

export type AgentRunOutcome = {
  readonly parked: boolean;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly cacheReadTokens: number;
  readonly contentFilter: boolean;
  readonly trimmedMessages: number;
};

type AgentSetup = {
  readonly runtime: AgentRuntime;
  readonly endpoint: ProviderEndpoint;
  readonly instructions: string;
  readonly tools: Record<string, AgentTool>;
  readonly requestId: string;
};

const modelOf = (endpoint: ProviderEndpoint, baseUrl: string) =>
  createOpenAICompatible({
    name: endpoint.spec,
    apiKey: endpoint.apiKey,
    baseURL: baseUrl,
  }).chatModel(endpoint.model);

const prepare = async (
  input: AgentSetup,
): Promise<{ agent: Agent; context: RequestContext; trimmedMessages: () => number }> => {
  const baseUrl = (
    await assertSafeOutboundUrl(input.endpoint.baseUrl, input.endpoint.allowPrivateOutbound)
  )
    .toString()
    .replace(/\/+$/, "");

  let trimmed = 0;

  const agent = new Agent({
    id: "wasanni-builder",
    name: "wasanni-builder",
    instructions: input.instructions,
    model: modelOf(input.endpoint, baseUrl),
    tools: input.tools,
    memory: input.runtime.memory,
    inputProcessors: [
      historyCompat,
      new TokenLimiterProcessor({
        limit: input.endpoint.maxRequestTokens ?? DEFAULT_REQUEST_TOKEN_LIMIT,
        strategy: "truncate",
        trimMode: "memory-only",
        onMemoryTrim: async (removed) => {
          trimmed += removed.length;
        },
      }),
    ],
    errorProcessors: [new StreamErrorRetryProcessor({ maxRetries: 0 })],
    maxProcessorRetries: 0,
    mastra: input.runtime.mastra,
  });

  return {
    agent,
    context: new RequestContext([["requestId", input.requestId]]),
    trimmedMessages: () => trimmed,
  };
};

const consume = async function* (
  stream: MastraModelOutput,
  trimmedMessages: () => number,
  agentRunId: string,
): AsyncGenerator<RunEvent, AgentRunOutcome, void> {
  let step = 0;
  let contentFilter = false;
  let parked = false;

  for await (const chunk of stream.fullStream) {
    if (chunk.type === "step-start") {
      step += 1;
      continue;
    }

    if (chunk.type === "text-delta") {
      yield { kind: "delta", text: chunk.payload.text, step };
      continue;
    }

    if (chunk.type === "reasoning-delta") {
      yield { kind: "thinking", text: chunk.payload.text, step };
      continue;
    }

    if (chunk.type === "tool-call") {
      yield { kind: "tool", tool: chunk.payload.toolName, state: "call", ok: true };
      continue;
    }

    if (chunk.type === "tool-result") {
      yield {
        kind: "tool",
        tool: chunk.payload.toolName,
        state: "result",
        ok: chunk.payload.isError !== true,
      };
      continue;
    }

    if (chunk.type === "step-finish") {
      contentFilter = chunk.payload.stepResult?.reason === "content-filter";
      continue;
    }

    if (chunk.type === "tool-call-approval") {
      parked = true;

      yield {
        kind: "approval",
        agentRunId,
        callId: chunk.payload.toolCallId,
        tool: chunk.payload.toolName,
        args: chunk.payload.args,
      };

      break;
    }

    if (chunk.type === "error") {
      throw chunk.payload.error instanceof Error
        ? chunk.payload.error
        : new Error("the agent run failed");
    }
  }

  const usage = await stream.usage;

  return {
    parked,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    cacheReadTokens: usage.cachedInputTokens ?? 0,
    contentFilter,
    trimmedMessages: trimmedMessages(),
  };
};

export const runAgent = async function* (
  input: AgentSetup & {
    readonly activeTools?: string[];
    readonly agentRunId: string;
    readonly prompt: string;
    readonly attachments: RunAgentBody["attachments"];
    readonly thread: string;
    readonly resource: string;
  },
): AsyncGenerator<RunEvent, AgentRunOutcome, void> {
  const { agent, context, trimmedMessages } = await prepare(input);

  const attachments = input.attachments ?? [];

  const message =
    attachments.length === 0
      ? input.prompt
      : {
          role: "user" as const,
          content: [
            { type: "text" as const, text: input.prompt },
            ...attachments.map((attachment) => ({
              type: "file" as const,
              filename: attachment.name,
              mediaType: attachment.mediaType,
              data: attachment.data,
            })),
          ],
        };

  const stream = await agent.stream(message, {
    runId: input.agentRunId,
    requestContext: context,
    memory: { thread: input.thread, resource: input.resource },
    maxSteps: MAX_AGENT_STEPS,
    activeTools: input.activeTools,
    abortSignal: AbortSignal.timeout(RUN_TIMEOUT_MS),
  });

  return yield* consume(stream, trimmedMessages, input.agentRunId);
};

export const resumeAgentRun = async function* (
  input: AgentSetup & {
    readonly agentRunId: string;
    readonly callId: string;
    readonly approved: boolean;
  },
): AsyncGenerator<RunEvent, AgentRunOutcome, void> {
  const { agent, context, trimmedMessages } = await prepare(input);

  const stream = input.approved
    ? await agent.approveToolCall({
        runId: input.agentRunId,
        requestContext: context,
        toolCallId: input.callId,
        maxSteps: MAX_AGENT_STEPS,
        abortSignal: AbortSignal.timeout(RUN_TIMEOUT_MS),
      })
    : await agent.declineToolCall({
        runId: input.agentRunId,
        requestContext: context,
        toolCallId: input.callId,
        reason: "the developer did not allow this call",
        maxSteps: MAX_AGENT_STEPS,
        abortSignal: AbortSignal.timeout(RUN_TIMEOUT_MS),
      });

  return yield* consume(stream, trimmedMessages, input.agentRunId);
};

export const pendingApprovals = async (
  input: AgentSetup & { readonly thread: string; readonly resource: string },
): Promise<AgentPendingApproval[]> => {
  const { agent } = await prepare(input);
  const { runs } = await agent.listSuspendedRuns({
    threadId: input.thread,
    resourceId: input.resource,
  });

  return runs.flatMap((run) =>
    run.toolCalls.flatMap((call) =>
      call.requiresApproval && call.toolCallId !== undefined && call.toolName !== undefined
        ? [
            {
              agentRunId: run.runId,
              callId: call.toolCallId,
              tool: call.toolName,
              args: call.args,
            },
          ]
        : [],
    ),
  );
};
