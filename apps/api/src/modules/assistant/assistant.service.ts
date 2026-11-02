import { Agent } from "@mastra/core/agent";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ModelMessage } from "ai";
import type { AssistantRunBody } from "@wasanni/contracts";
import { assertSafeOutboundUrl, BadRequestError, HttpError, newId } from "@wasanni/kit";
import { createApiDocsTool, createGuideTool } from "../agent/tools.ts";
import { classifyProviderError } from "../agent/provider-error.ts";
import { DOCS_PATH } from "../../constants.ts";
import {
  ASSISTANT_MAX_STEPS,
  ASSISTANT_SYSTEM_PROMPT,
  ASSISTANT_TIMEOUT_MS,
} from "./constants.ts";
import type { AssistantDeps, AssistantEvent } from "./types.ts";

export function createAssistantService(deps: AssistantDeps) {
  const { api, allowPrivateOutbound, logger, platformProvider } = deps;

  const tools = {
    ...createApiDocsTool({ api, docsJsonPath: `${DOCS_PATH}/json` }),
    ...createGuideTool(),
  };

  const streamOf = async function* (
    body: AssistantRunBody,
    requestId: string,
    signal: AbortSignal,
    provider: { apiKey: string; baseUrl: string; model: string },
  ): AsyncGenerator<AssistantEvent, void, void> {
    const startedAt = performance.now();
    const runId = newId();
    const log = logger.child({ requestId, assistantRunId: runId });

    const baseUrl = (
      await assertSafeOutboundUrl(provider.baseUrl, allowPrivateOutbound)
    )
      .toString()
      .replace(/\/+$/, "");

    const agent = new Agent({
      id: "wasanni-assistant",
      name: "wasanni-assistant",
      instructions: ASSISTANT_SYSTEM_PROMPT,
      model: createOpenAICompatible({
        name: "fireworks-ai",
        apiKey: provider.apiKey,
        baseURL: baseUrl,
      }).chatModel(provider.model),
      tools,
    });

    const history: ModelMessage[] = body.messages.map((turn) =>
      turn.role === "assistant"
        ? { role: "assistant" as const, content: turn.text }
        : { role: "user" as const, content: turn.text },
    );

    const stream = await agent.stream(history, {
      runId,
      maxSteps: ASSISTANT_MAX_STEPS,
      abortSignal: AbortSignal.any([AbortSignal.timeout(ASSISTANT_TIMEOUT_MS), signal]),
    });

    let step = 0;

    try {
      for await (const chunk of stream.fullStream) {
        if (chunk.type === "step-start") step += 1;
        else if (chunk.type === "text-delta")
          yield { kind: "delta", text: chunk.payload.text, step };
        else if (chunk.type === "reasoning-delta")
          yield { kind: "thinking", text: chunk.payload.text, step };
        else if (chunk.type === "tool-call")
          yield { kind: "tool", tool: chunk.payload.toolName, state: "call", ok: true };
        else if (chunk.type === "tool-result")
          yield {
            kind: "tool",
            tool: chunk.payload.toolName,
            state: "result",
            ok: chunk.payload.isError !== true,
          };
        else if (chunk.type === "error")
          throw chunk.payload.error instanceof Error
            ? chunk.payload.error
            : new Error("the assistant run failed");
      }

      yield {
        kind: "done",
        runId,
        model: provider.model,
        durationMs: Math.round(performance.now() - startedAt),
      };

      log.info("assistant.run", {
        model: provider.model,
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (caught) {
      if (caught instanceof HttpError) {
        log.warn("assistant.run_refused", { err: caught.message });

        yield {
          kind: "error",
          code: "request_refused",
          message: caught.message,
          retryable: false,
        };
        return;
      }

      const failure = classifyProviderError(caught);

      log.warn("assistant.run_failed", {
        model: provider.model,
        code: failure.code,
        statusCode: failure.statusCode,
        err: failure.message,
      });

      yield {
        kind: "error",
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
      };
    }
  };

  return {
    ask(
      body: AssistantRunBody,
      requestId: string,
      signal: AbortSignal,
    ): AsyncGenerator<AssistantEvent, void, void> {
      if (platformProvider === null) {
        throw new BadRequestError("the assistant has no model provider configured");
      }

      return streamOf(body, requestId, signal, platformProvider);
    },
  };
}
