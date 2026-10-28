import { CONTENT_TYPE_DEFAULT, CONTENT_TYPES } from "./constants.ts";
import type { ResolvedContent } from "./types.ts";

const extensionOf = (path: string): string => path.split(".").pop()?.toLowerCase() ?? "";

const typeOf = (path: string): string =>
  CONTENT_TYPES[extensionOf(path)] ?? CONTENT_TYPE_DEFAULT;

export function resolveContent(path: string): ResolvedContent {
  const lower = path.toLowerCase();

  if (lower.endsWith(".gz")) {
    const servedPath = path.slice(0, -3);

    return { servedPath, contentType: typeOf(servedPath), contentEncoding: "gzip" };
  }

  if (lower.endsWith(".br")) {
    const servedPath = path.slice(0, -3);

    return { servedPath, contentType: typeOf(servedPath), contentEncoding: "br" };
  }

  return { servedPath: path, contentType: typeOf(path), contentEncoding: null };
}
