import { STATUS } from "@wasanni/contracts";
import type { ErrorCode } from "@wasanni/contracts";
import type { HttpErrorOptions } from "./types.ts";

export abstract class HttpError extends Error {
  abstract readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, options?: HttpErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.details = options?.details;
  }

  get status(): number {
    return STATUS[this.code];
  }
}
