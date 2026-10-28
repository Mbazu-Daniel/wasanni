import {
  LEVELS,
  MAX_REDACTION_DEPTH,
  REDACTED,
  REDACT_KEY,
} from "./constants.ts";
import type { LogLevel, Logger } from "./types.ts";

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACTION_DEPTH || value === null || typeof value !== "object") return value;
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEY.test(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

export function createLogger(opts: {
  level: LogLevel;
  pretty?: boolean;
  bindings?: Record<string, unknown>;
}): Logger {
  const threshold = LEVELS[opts.level];
  const bindings = opts.bindings ?? {};

  const emit = (level: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (LEVELS[level] < threshold) return;

    const line = opts.pretty
      ? `${level.toUpperCase().padEnd(5)} ${msg}${fields ? " " + JSON.stringify(redact(fields)) : ""}`
      : JSON.stringify(
          redact({ ...bindings, ...fields, level, msg, time: new Date().toISOString() }),
        );

    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (f) => createLogger({ ...opts, bindings: { ...bindings, ...f } }),
  };
}
