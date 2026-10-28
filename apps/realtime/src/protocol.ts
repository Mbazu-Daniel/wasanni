import type { RealtimeClientMessage } from "@wasanni/contracts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decode = (raw: unknown): unknown => {
  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function parseClientMessage(raw: unknown): RealtimeClientMessage | null {
  const parsed = decode(raw);

  if (!isRecord(parsed)) return null;

  switch (parsed.type) {
    case "ping":
      return { type: "ping" };

    case "event":
      return { type: "event", data: parsed.data ?? null };

    case "score": {
      const score = parsed.score;

      if (typeof score !== "number" || !Number.isFinite(score)) return null;
      if (score < 0 || score > Number.MAX_SAFE_INTEGER) return null;

      const endSession = parsed.endSession;
      const signature = parsed.signature;

      if (signature !== undefined && typeof signature !== "string") return null;
      if (signature !== undefined && signature.length > 512) return null;

      if (endSession === undefined) {
        return signature === undefined
          ? { type: "score", score }
          : { type: "score", score, signature };
      }
      if (typeof endSession !== "boolean") return null;

      return signature === undefined
        ? { type: "score", score, endSession }
        : { type: "score", score, signature, endSession };
    }

    default:
      return null;
  }
}
