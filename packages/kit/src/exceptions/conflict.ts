import { HttpError } from "./base-error.ts";

export class ConflictError extends HttpError {
  readonly code = "conflict" as const;
}
