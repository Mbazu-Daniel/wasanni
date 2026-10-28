import { HttpError } from "./base-error.ts";

export class BadRequestError extends HttpError {
  readonly code = "bad_request" as const;
}
