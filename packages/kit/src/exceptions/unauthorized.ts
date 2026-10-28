import { HttpError } from "./base-error.ts";
import type { HttpErrorOptions } from "./types.ts";

export class UnauthorizedError extends HttpError {
  readonly code = "unauthenticated" as const;

  constructor(message = "unauthenticated", options?: HttpErrorOptions) {
    super(message, options);
  }
}
