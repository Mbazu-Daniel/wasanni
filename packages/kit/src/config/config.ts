import {
  DB_POOL_RANGE,
  DEFAULT_DB_POOL_MAX,
  DEFAULT_DB_POOL_MAX_REALTIME,
  DEFAULT_DB_POOL_MAX_WORKER,
  DEFAULT_EMAIL_FROM_ADDRESS,
  DEFAULT_EMAIL_FROM_NAME,
  DEFAULT_FD_LIMIT_MINIMUM,
  DEFAULT_GAME_BUNDLE_MAX_FILES,
  DEFAULT_GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES,
  DEFAULT_NODE_ENV,
  DEFAULT_PORT,
  DEFAULT_REALTIME_PORT,
  DEFAULT_REALTIME_PUBLIC_URL,
  DEFAULT_SCORE_ARCHIVE_CRON,
  DEFAULT_SCORE_ARCHIVE_DRY_RUN,
  DEFAULT_SCORE_VERIFICATION_ENABLED,
  DEFAULT_SCORE_ARCHIVE_ENABLED,
  DEFAULT_SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN,
  DEFAULT_SCORE_ARCHIVE_RETENTION_HOURS,
  DEFAULT_SCORE_PARTITIONING_ENABLED,
  DEFAULT_SCORE_PARTITION_PREMAKE_HOURS,
  DEFAULT_SCORE_RATE_LIMIT_PER_MINUTE,
  DEFAULT_SESSION_RATE_LIMIT_PER_MINUTE,
  DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS,
  DEFAULT_USAGE_METERING_ENABLED,
  DEFAULT_STORAGE_MAX_GAME_BUNDLE_BYTES,
  DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS,
  DEFAULT_WEB_ORIGIN,
  DEFAULT_WS_IDLE_TIMEOUT_SECONDS,
  DEFAULT_WS_MAX_MESSAGE_BYTES,
  FD_LIMIT_RANGE,
  GAME_BUNDLE_MAX_FILES_RANGE,
  GAME_BUNDLE_MAX_UNCOMPRESSED_RANGE,
  NODE_ENVS,
  PORT_RANGE,
  RATE_LIMIT_RANGE,
  SECRET_MIN_LENGTH,
  SCORE_ARCHIVE_MAX_PARTITIONS_RANGE,
  SCORE_ARCHIVE_RETENTION_RANGE,
  SCORE_PARTITION_PREMAKE_RANGE,
  STORAGE_MAX_GAME_BUNDLE_BYTES_RANGE,
  STORAGE_URL_TTL_RANGE,
  WS_IDLE_TIMEOUT_RANGE,
  WS_MAX_MESSAGE_BYTES_RANGE,
} from "./constants.ts";
import { LOG_LEVELS } from "../logger/constants.ts";
import type { Env, RawEnv, StorageLimits } from "./types.ts";

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

function readPort(
  raw: RawEnv,
  problems: Problems,
  key: string,
  fallback: number = DEFAULT_PORT,
): number {
  const value = raw[key]?.trim();

  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < PORT_RANGE.min || parsed > PORT_RANGE.max) {
    problems.add(
      key,
      `must be an integer between ${PORT_RANGE.min} and ${PORT_RANGE.max}`,
    );
    return fallback;
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

function readBoolean(
  raw: RawEnv,
  problems: Problems,
  key: string,
  fallback: boolean,
): boolean {
  const value = raw[key]?.trim().toLowerCase();

  if (value === undefined || value === "") return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  problems.add(key, "must be true or false");
  return fallback;
}

function readNumber(
  raw: RawEnv,
  problems: Problems,
  key: string,
  fallback: number,
  range: { readonly min: number; readonly max: number },
): number {
  const value = raw[key]?.trim();

  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < range.min || parsed > range.max) {
    problems.add(key, `must be an integer between ${range.min} and ${range.max}`);
    return fallback;
  }

  return parsed;
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
    R2_ACCOUNT_ID: readOptional(raw, "R2_ACCOUNT_ID"),
    R2_ACCESS_KEY_ID: readOptional(raw, "R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: readOptional(raw, "R2_SECRET_ACCESS_KEY"),
    R2_BUCKET_NAME: readOptional(raw, "R2_BUCKET_NAME"),
    R2_PUBLIC_ID: readOptional(raw, "R2_PUBLIC_ID"),
    R2_CUSTOM_DOMAIN: readOptional(raw, "R2_CUSTOM_DOMAIN"),
    STORAGE_UPLOAD_URL_TTL_SECONDS: readNumber(
      raw,
      problems,
      "STORAGE_UPLOAD_URL_TTL_SECONDS",
      DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS,
      STORAGE_URL_TTL_RANGE,
    ),
    STORAGE_DOWNLOAD_URL_TTL_SECONDS: readNumber(
      raw,
      problems,
      "STORAGE_DOWNLOAD_URL_TTL_SECONDS",
      DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS,
      STORAGE_URL_TTL_RANGE,
    ),
    STORAGE_MAX_GAME_BUNDLE_BYTES: readNumber(
      raw,
      problems,
      "STORAGE_MAX_GAME_BUNDLE_BYTES",
      DEFAULT_STORAGE_MAX_GAME_BUNDLE_BYTES,
      STORAGE_MAX_GAME_BUNDLE_BYTES_RANGE,
    ),
    WEBHOOK_SECRET_ENCRYPTION_KEY: readSecret(
      raw,
      problems,
      "WEBHOOK_SECRET_ENCRYPTION_KEY",
    ),
    EMAIL_FROM_ADDRESS: readString(
      raw,
      problems,
      "EMAIL_FROM_ADDRESS",
      DEFAULT_EMAIL_FROM_ADDRESS,
    ),
    EMAIL_FROM_NAME: readString(raw, problems, "EMAIL_FROM_NAME", DEFAULT_EMAIL_FROM_NAME),
    ZEPTOMAIL_API_KEY: readOptional(raw, "ZEPTOMAIL_API_KEY"),
    REALTIME_PORT: readPort(raw, problems, "REALTIME_PORT", DEFAULT_REALTIME_PORT),
    REALTIME_PUBLIC_URL: readString(
      raw,
      problems,
      "REALTIME_PUBLIC_URL",
      DEFAULT_REALTIME_PUBLIC_URL,
    ),
    API_INTERNAL_URL: readString(
      raw,
      problems,
      "API_INTERNAL_URL",
      `http://localhost:${port}`,
    ),
    WS_IDLE_TIMEOUT_SECONDS: readNumber(
      raw,
      problems,
      "WS_IDLE_TIMEOUT_SECONDS",
      DEFAULT_WS_IDLE_TIMEOUT_SECONDS,
      WS_IDLE_TIMEOUT_RANGE,
    ),
    WS_MAX_MESSAGE_BYTES: readNumber(
      raw,
      problems,
      "WS_MAX_MESSAGE_BYTES",
      DEFAULT_WS_MAX_MESSAGE_BYTES,
      WS_MAX_MESSAGE_BYTES_RANGE,
    ),
    DB_POOL_MAX: readNumber(raw, problems, "DB_POOL_MAX", DEFAULT_DB_POOL_MAX, DB_POOL_RANGE),
    DB_POOL_MAX_WORKER: readNumber(
      raw,
      problems,
      "DB_POOL_MAX_WORKER",
      DEFAULT_DB_POOL_MAX_WORKER,
      DB_POOL_RANGE,
    ),
    DB_POOL_MAX_REALTIME: readNumber(
      raw,
      problems,
      "DB_POOL_MAX_REALTIME",
      DEFAULT_DB_POOL_MAX_REALTIME,
      DB_POOL_RANGE,
    ),
    FD_LIMIT_MINIMUM: readNumber(
      raw,
      problems,
      "FD_LIMIT_MINIMUM",
      DEFAULT_FD_LIMIT_MINIMUM,
      FD_LIMIT_RANGE,
    ),
    SCORE_PARTITIONING_ENABLED: readBoolean(
      raw,
      problems,
      "SCORE_PARTITIONING_ENABLED",
      DEFAULT_SCORE_PARTITIONING_ENABLED,
    ),
    SCORE_PARTITION_PREMAKE_HOURS: readNumber(
      raw,
      problems,
      "SCORE_PARTITION_PREMAKE_HOURS",
      DEFAULT_SCORE_PARTITION_PREMAKE_HOURS,
      SCORE_PARTITION_PREMAKE_RANGE,
    ),
    SCORE_ARCHIVE_ENABLED: readBoolean(
      raw,
      problems,
      "SCORE_ARCHIVE_ENABLED",
      DEFAULT_SCORE_ARCHIVE_ENABLED,
    ),
    SCORE_ARCHIVE_CRON: readString(
      raw,
      problems,
      "SCORE_ARCHIVE_CRON",
      DEFAULT_SCORE_ARCHIVE_CRON,
    ),
    SCORE_ARCHIVE_RETENTION_HOURS: readNumber(
      raw,
      problems,
      "SCORE_ARCHIVE_RETENTION_HOURS",
      DEFAULT_SCORE_ARCHIVE_RETENTION_HOURS,
      SCORE_ARCHIVE_RETENTION_RANGE,
    ),
    SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN: readNumber(
      raw,
      problems,
      "SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN",
      DEFAULT_SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN,
      SCORE_ARCHIVE_MAX_PARTITIONS_RANGE,
    ),
    SCORE_ARCHIVE_DRY_RUN: readBoolean(
      raw,
      problems,
      "SCORE_ARCHIVE_DRY_RUN",
      DEFAULT_SCORE_ARCHIVE_DRY_RUN,
    ),
    SCORE_RATE_LIMIT_PER_MINUTE: readNumber(
      raw,
      problems,
      "SCORE_RATE_LIMIT_PER_MINUTE",
      DEFAULT_SCORE_RATE_LIMIT_PER_MINUTE,
      RATE_LIMIT_RANGE,
    ),
    SESSION_RATE_LIMIT_PER_MINUTE: readNumber(
      raw,
      problems,
      "SESSION_RATE_LIMIT_PER_MINUTE",
      DEFAULT_SESSION_RATE_LIMIT_PER_MINUTE,
      RATE_LIMIT_RANGE,
    ),
    GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES: readNumber(
      raw,
      problems,
      "GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES",
      DEFAULT_GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES,
      GAME_BUNDLE_MAX_UNCOMPRESSED_RANGE,
    ),
    GAME_BUNDLE_MAX_FILES: readNumber(
      raw,
      problems,
      "GAME_BUNDLE_MAX_FILES",
      DEFAULT_GAME_BUNDLE_MAX_FILES,
      GAME_BUNDLE_MAX_FILES_RANGE,
    ),
    USAGE_METERING_ENABLED: readBoolean(
      raw,
      problems,
      "USAGE_METERING_ENABLED",
      DEFAULT_USAGE_METERING_ENABLED,
    ),
    SCORE_VERIFICATION_ENABLED: readBoolean(
      raw,
      problems,
      "SCORE_VERIFICATION_ENABLED",
      DEFAULT_SCORE_VERIFICATION_ENABLED,
    ),
  };

  if (problems.invalid) throw problems.report();

  return parsed;
}

export function readStorageLimits(env: Env): StorageLimits {
  return {
    maxBundleBytes: env.STORAGE_MAX_GAME_BUNDLE_BYTES,
    uploadUrlTtlSeconds: env.STORAGE_UPLOAD_URL_TTL_SECONDS,
    downloadUrlTtlSeconds: env.STORAGE_DOWNLOAD_URL_TTL_SECONDS,
  };
}

let cached: Env | undefined;

export function readEnv(): Env {
  cached ??= parseEnv({ ...Bun.env });
  return cached;
}
