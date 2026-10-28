export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export const LEVELS: Record<(typeof LOG_LEVELS)[number], number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export const REDACT_KEY =
  /^(password|passwd|secret|token|authorization|cookie|api_?key|access_?token|refresh_?token|session_?token)$/i;

export const REDACTED = "[redacted]";
export const MAX_REDACTION_DEPTH = 6;
