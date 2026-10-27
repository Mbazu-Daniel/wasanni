import { HttpError } from "./base-error.ts";
import type { HttpErrorOptions } from "./types.ts";

export class InternalServerError extends HttpError {
  readonly code = "internal" as const;

  constructor(message = "internal error", options?: HttpErrorOptions) {
    super(message, options);
  }
}
