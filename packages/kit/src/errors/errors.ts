import { STATUS } from "@wasanni/contracts";
import type { ErrorCode } from "@wasanni/contracts";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return STATUS[this.code];
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError("bad_request", message, details);

export const unauthenticated = (message = "unauthenticated") =>
  new AppError("unauthenticated", message);

export const forbidden = (message = "forbidden") => new AppError("forbidden", message);

export const notFound = (message = "not found") => new AppError("not_found", message);

export const conflict = (message: string) => new AppError("conflict", message);

export const internal = (message = "internal error") =>
  new AppError("internal", message);
