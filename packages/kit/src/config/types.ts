import { NODE_ENVS } from "./constants.ts";
import type { LogLevel } from "../logger/types.ts";

export type RawEnv = Record<string, string | undefined>;

export type NodeEnv = (typeof NODE_ENVS)[number];

export type Env = {
  readonly NODE_ENV: NodeEnv;
  readonly LOG_LEVEL: LogLevel;
  readonly PORT: number;
  readonly DATABASE_URL: string;
  readonly REDIS_URL: string;
  readonly SESSION_SECRET: string;
  readonly API_KEY_PEPPER: string;
  readonly REALTIME_JWT_SECRET: string;
  readonly PUBLIC_WEB_ORIGIN: string;
  readonly COOKIE_DOMAIN: string | undefined;
};
