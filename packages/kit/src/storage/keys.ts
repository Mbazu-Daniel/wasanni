import { newId } from "../publicid/publicid.ts";
import {
  STORAGE_KEY_FILENAME_MAX_LENGTH,
  STORAGE_KEY_SEGMENT_MAX_LENGTH,
} from "./constants.ts";
import type { StorageLocation } from "./types.ts";

function sanitizeSegment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, STORAGE_KEY_SEGMENT_MAX_LENGTH);

  return cleaned.length > 0 ? cleaned : "segment";
}

function sanitizeFilename(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(-STORAGE_KEY_FILENAME_MAX_LENGTH);

  return cleaned.length > 0 ? cleaned : "file";
}

export function buildObjectKey(input: {
  location: StorageLocation;
  organizationId: string;
  segments: string[];
  filename: string;
}): string {
  const parts = [
    input.location,
    sanitizeSegment(input.organizationId),
    ...input.segments.map(sanitizeSegment),
    `${newId()}-${sanitizeFilename(input.filename)}`,
  ];

  return parts.join("/");
}
