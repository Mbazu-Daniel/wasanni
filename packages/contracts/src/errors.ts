export const ERROR_CODES = [
  "bad_request",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "unprocessable",
  "internal",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unprocessable: 422,
  internal: 500,
};

export type ErrorSource = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};
