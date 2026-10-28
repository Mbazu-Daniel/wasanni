import { HttpError } from "./base-error.ts";
import type { HttpErrorOptions } from "./types.ts";

export class ForbiddenError extends HttpError {
  readonly code = "forbidden" as const;

  constructor(message = "forbidden", options?: HttpErrorOptions) {
    super(message, options);
  }
}
