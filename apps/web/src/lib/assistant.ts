import { streamEvents } from "./agent-run";

export type AssistantTurn = { role: "user" | "assistant"; text: string };

export type AssistantEvent =
  | { kind: "delta"; text: string; step: number }
  | { kind: "thinking"; text: string; step: number }
  | { kind: "tool"; tool: string; state: "call" | "result"; ok: boolean }
  | { kind: "done"; runId: string; model: string; durationMs: number }
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

const TURNS_KEY = "wasanni:assistant:turns";
const MAX_TURNS = 40;

export const readTurns = (): AssistantTurn[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(TURNS_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];

    return stored
      .filter(
        (turn): turn is AssistantTurn =>
          typeof turn === "object" &&
          turn !== null &&
          typeof (turn as AssistantTurn).text === "string" &&
          ((turn as { role?: unknown }).role === "user" ||
            (turn as { role?: unknown }).role === "assistant"),
      )
      .slice(-MAX_TURNS);
  } catch {
    return [];
  }
};

export const writeTurns = (turns: AssistantTurn[]): void => {
  if (typeof window === "undefined") return;

  const kept = turns
    .filter((turn) => turn.text.trim() !== "")
    .slice(-MAX_TURNS);

  if (kept.length === 0) window.localStorage.removeItem(TURNS_KEY);
  else window.localStorage.setItem(TURNS_KEY, JSON.stringify(kept));
};

export const askAssistant = async (input: {
  turns: AssistantTurn[];
  signal: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}): Promise<void> =>
  streamEvents<AssistantEvent>(
    "/api/v1/assistant",
    { messages: input.turns },
    input.signal,
    input.onEvent,
  );

export const messageOf = (caught: unknown): string =>
  caught instanceof Error && caught.message !== ""
    ? caught.message
    : "the assistant could not answer";
