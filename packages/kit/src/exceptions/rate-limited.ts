import { HttpError } from "./base-error.ts";

export class RateLimitedError extends HttpError {
  readonly code = "rate_limited" as const;
}
