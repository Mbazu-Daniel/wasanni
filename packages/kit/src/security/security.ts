import { createHash, randomBytes } from "node:crypto";
import { API_KEY_PREFIX, API_KEY_RANDOM_BYTES } from "./constants.ts";

export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function newApiKeySecret(): string {
  return `${API_KEY_PREFIX}${newOpaqueToken(API_KEY_RANDOM_BYTES)}`;
}

export function hashApiKey(secret: string): string {
  return sha256Hex(secret);
}
