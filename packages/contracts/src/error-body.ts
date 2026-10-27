import type { ErrorBodyModel } from "./model.ts";
import type { ErrorSource } from "./errors.ts";

export function toErrorBody(error: ErrorSource, requestId: string): ErrorBodyModel {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
      requestId,
    },
  };
}
