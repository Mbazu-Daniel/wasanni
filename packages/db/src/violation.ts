import { UNIQUE_VIOLATION } from "./constants.ts";

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  while (typeof current === "object" && current !== null) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
}
