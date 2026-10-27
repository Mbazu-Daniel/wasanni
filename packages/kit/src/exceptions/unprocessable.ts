import { HttpError } from "./base-error.ts";

export class UnprocessableError extends HttpError {
  readonly code = "unprocessable" as const;
}
