import { NODE_ENVS } from "./constants.ts";
import type { LogLevel } from "../logger/types.ts";

export type RawEnv = Record<string, string | undefined>;

export type StorageLimits = {
  readonly maxBundleBytes: number;
  readonly uploadUrlTtlSeconds: number;
  readonly downloadUrlTtlSeconds: number;
};

export type NodeEnv = (typeof NODE_ENVS)[number];

export type Env = {
  readonly NODE_ENV: NodeEnv;
  readonly LOG_LEVEL: LogLevel;
  readonly PORT: number;
  readonly DATABASE_URL: string;
  readonly REDIS_URL: string;
  readonly SESSION_SECRET: string;
  readonly PUBLIC_WEB_ORIGIN: string;
  readonly BETTER_AUTH_URL: string;
  readonly GOOGLE_CLIENT_ID: string | undefined;
  readonly GOOGLE_CLIENT_SECRET: string | undefined;
  readonly GITHUB_CLIENT_ID: string | undefined;
  readonly GITHUB_CLIENT_SECRET: string | undefined;
  readonly R2_ACCOUNT_ID: string | undefined;
  readonly R2_ACCESS_KEY_ID: string | undefined;
  readonly R2_SECRET_ACCESS_KEY: string | undefined;
  readonly R2_BUCKET_NAME: string | undefined;
  readonly R2_PUBLIC_ID: string | undefined;
  readonly R2_CUSTOM_DOMAIN: string | undefined;
  readonly STORAGE_UPLOAD_URL_TTL_SECONDS: number;
  readonly STORAGE_DOWNLOAD_URL_TTL_SECONDS: number;
  readonly STORAGE_MAX_GAME_BUNDLE_BYTES: number;
  readonly WEBHOOK_SECRET_ENCRYPTION_KEY: string;
  readonly EMAIL_FROM_ADDRESS: string;
  readonly EMAIL_FROM_NAME: string;
  readonly ZEPTOMAIL_API_KEY: string | undefined;
  readonly REALTIME_PORT: number;
  readonly REALTIME_PUBLIC_URL: string;
  readonly API_INTERNAL_URL: string;
  readonly WS_IDLE_TIMEOUT_SECONDS: number;
  readonly WS_MAX_MESSAGE_BYTES: number;
};
