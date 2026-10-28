import {
  DEFAULT_NODE_ENV,
  DEFAULT_PORT,
  DEFAULT_WEB_ORIGIN,
  NODE_ENVS,
  PORT_RANGE,
  SECRET_MIN_LENGTH,
} from "./constants.ts";
import { LOG_LEVELS } from "../logger/constants.ts";
import type { Env, RawEnv } from "./types.ts";

class Problems {
  readonly lines: string[] = [];

  add(key: string, message: string): void {
    this.lines.push(`  ${key}: ${message}`);
  }

  get invalid(): boolean {
    return this.lines.length > 0;
  }

  report(): Error {
    return new Error(`Invalid environment configuration:\n${this.lines.join("\n")}`);
  }
}

function readString(raw: RawEnv, problems: Problems, key: string, fallback?: string): string {
  const value = raw[key]?.trim();

  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    problems.add(key, "is required");
    return "";
  }

  return value;
}

function readSecret(raw: RawEnv, problems: Problems, key: string): string {
  const value = readString(raw, problems, key);

  if (value !== "" && value.length < SECRET_MIN_LENGTH) {
    problems.add(key, `must be at least ${SECRET_MIN_LENGTH} characters`);
  }

  return value;
}

function readPort(raw: RawEnv, problems: Problems, key: string): number {
  const value = raw[key]?.trim();

  if (value === undefined || value === "") return DEFAULT_PORT;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < PORT_RANGE.min || parsed > PORT_RANGE.max) {
    problems.add(
      key,
      `must be an integer between ${PORT_RANGE.min} and ${PORT_RANGE.max}`,
    );
    return DEFAULT_PORT;
  }

  return parsed;
}

function readEnum<T extends string>(
  raw: RawEnv,
  problems: Problems,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = raw[key]?.trim();

  if (value === undefined || value === "") return fallback;

  if (!allowed.includes(value as T)) {
    problems.add(key, `must be one of ${allowed.join(", ")}`);
    return fallback;
  }

  return value as T;
}

function readOptional(raw: RawEnv, key: string): string | undefined {
  return raw[key]?.trim() || undefined;
}

export function parseEnv(raw: RawEnv): Env {
  const problems = new Problems();

  const port = readPort(raw, problems, "PORT");

  const parsed: Env = {
    NODE_ENV: readEnum(raw, problems, "NODE_ENV", NODE_ENVS, DEFAULT_NODE_ENV),
    LOG_LEVEL: readEnum(raw, problems, "LOG_LEVEL", LOG_LEVELS, "info"),
    PORT: port,
    DATABASE_URL: readString(raw, problems, "DATABASE_URL"),
    REDIS_URL: readString(raw, problems, "REDIS_URL"),
    SESSION_SECRET: readSecret(raw, problems, "SESSION_SECRET"),
    PUBLIC_WEB_ORIGIN: readString(raw, problems, "PUBLIC_WEB_ORIGIN", DEFAULT_WEB_ORIGIN),
    BETTER_AUTH_URL: readString(raw, problems, "BETTER_AUTH_URL", `http://localhost:${port}`),
    GOOGLE_CLIENT_ID: readOptional(raw, "GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: readOptional(raw, "GOOGLE_CLIENT_SECRET"),
    GITHUB_CLIENT_ID: readOptional(raw, "GITHUB_CLIENT_ID"),
    GITHUB_CLIENT_SECRET: readOptional(raw, "GITHUB_CLIENT_SECRET"),
  };

  if (problems.invalid) throw problems.report();

  return parsed;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv({ ...Bun.env });
  return cached;
}
