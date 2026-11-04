import type { Logger } from "@wasanni/kit";
import type { ProviderErrorCode } from "../agent/provider-error.ts";
import type { createAssistantService } from "./assistant.service.ts";

export type AssistantService = ReturnType<typeof createAssistantService>;

export type AssistantProvider = {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
};

export type AssistantDeps = {
  api: { handle(request: Request): Response | Promise<Response> };
  logger: Logger;
  allowPrivateOutbound: boolean;
  platformProvider: AssistantProvider | null;
};

export type AssistantEvent =
  | { kind: "delta"; text: string; step: number }
  | { kind: "thinking"; text: string; step: number }
  | { kind: "tool"; tool: string; state: "call" | "result"; ok: boolean }
  | { kind: "done"; runId: string; model: string; durationMs: number }
  | {
      kind: "error";
      code: ProviderErrorCode | "request_refused";
      message: string;
      retryable: boolean;
    };
