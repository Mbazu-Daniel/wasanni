import { MAX_CURSOR_LENGTH } from "./constants.ts";
import { badRequest } from "../errors/errors.ts";

const CURSOR_RE = /^[A-Za-z0-9_-]+$/;

export function encodeCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    if (
      typeof cursor !== "string" ||
      cursor.length === 0 ||
      cursor.length > MAX_CURSOR_LENGTH ||
      !CURSOR_RE.test(cursor)
    ) {
      throw new Error("invalid cursor format");
    }

    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("cursor must be an object");
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw badRequest("invalid cursor");
  }
}
