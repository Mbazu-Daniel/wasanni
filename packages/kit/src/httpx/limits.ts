import { DEFAULT_LIMIT, MAX_LIMIT } from "./constants.ts";

export function clampLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_LIMIT;
  }

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_LIMIT);
}
