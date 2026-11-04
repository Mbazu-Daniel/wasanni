import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function loadLocalEnv(dir) {
  const merged = {};
  for (const file of [".env", ".env.local"]) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 1) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function requiredEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function toBool(raw, fallback = false) {
  const value = raw?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function parseRoutes(raw) {
  const value = raw?.trim();
  if (!value) return [];
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`CF_ROUTES must be a JSON array of route objects (${error.message})`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("CF_ROUTES must be a JSON array of route objects");
  }
  return parsed;
}

export function resolveBuildEnvironment(env = process.env) {
  return {
    ...env,
    VITE_API_URL: requiredEnv(env, "VITE_API_URL"),
  };
}

export function resolveWorkerConfig(env = process.env) {
  resolveBuildEnvironment(env);
  const branch = env.WORKERS_CI_BRANCH ?? env.GITHUB_REF_NAME ?? "local";
  const workerName = env.CF_WORKER_NAME?.trim();
  return {
    name: workerName || (branch === "main" ? "wasanni-web" : "wasanni-web-dev"),
    main: "./server/server.js",
    compatibility_date: env.CF_COMPAT_DATE?.trim() || "2026-11-01",
    compatibility_flags: [],
    workers_dev: toBool(env.CF_WORKERS_DEV),
    preview_urls: false,
    assets: {
      directory: "./client",
      binding: "ASSETS",
    },
    observability: {
      enabled: true,
      head_sampling_rate: 1,
      redact_query_string: true,
      logs: {
        enabled: true,
        head_sampling_rate: 1,
        persist: true,
        invocation_logs: true,
      },
      traces: {
        enabled: true,
        persist: true,
        head_sampling_rate: 1,
      },
    },
    vars: {},
    routes: parseRoutes(env.CF_ROUTES),
  };
}
