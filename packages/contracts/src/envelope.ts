import type { EnvelopeModel } from "./model.ts";
import type { EnvelopeSource } from "./types.ts";

export function toEnvelope(error: EnvelopeSource, requestId: string): EnvelopeModel["error"] {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
      requestId,
    },
  };
}
