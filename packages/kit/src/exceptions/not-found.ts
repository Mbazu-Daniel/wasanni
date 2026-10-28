import { HttpError } from "./base-error.ts";
import type { HttpErrorOptions } from "./types.ts";

export class NotFoundError extends HttpError {
  readonly code = "not_found" as const;

  constructor(message = "not found", options?: HttpErrorOptions) {
    super(message, options);
  }
}
