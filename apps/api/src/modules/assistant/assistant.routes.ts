import { AssistantRunBody } from "@wasanni/contracts";
import { HttpError } from "@wasanni/kit";
import { requestContextOf } from "../../plugins/request-context.ts";
import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import type { AssistantService, AssistantEvent } from "./types.ts";

const encoder = new TextEncoder();

const errorEvent = (error: unknown): AssistantEvent =>
  error instanceof HttpError
    ? { kind: "error", code: "request_refused", message: error.message, retryable: false }
    : { kind: "error", code: "provider_unknown", message: "the assistant stopped unexpectedly", retryable: true };

const sse = (events: AsyncGenerator<AssistantEvent, void, void>): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        let next: IteratorResult<AssistantEvent, void>;
        try {
          next = await events.next();
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent(error))}\n\n`));
          controller.close();
          return;
        }

        if (next.done ?? false) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`));
      },
      async cancel() {
        await events.return();
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
      },
    },
  );

export const createAssistantRoutes = <T extends PrincipalApi>(
  api: T,
  deps: { service: AssistantService; rateLimit: RateLimitHook },
) =>
  api.post(
    "/api/v1/assistant",
    async ({ body, request }) => {
      const controller = new AbortController();
      request.signal.addEventListener("abort", () => controller.abort(), { once: true });

      return sse(
        deps.service.ask(body, requestContextOf(request).requestId, controller.signal),
      );
    },
    {
      body: AssistantRunBody,
      beforeHandle: deps.rateLimit("assistant"),
      detail: { tags: ["assistant"], summary: "Ask the Wasanni docs assistant a question" },
    },
  );
