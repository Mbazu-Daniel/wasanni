import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  API_KEY_PREFIX,
  API_KEY_PREFIX_BYTES,
  API_KEY_SECRET_BYTES,
  ARGON,
} from "./constants.ts";
import type { GeneratedApiKey } from "./types.ts";

const API_KEY_RE = new RegExp(`^${API_KEY_PREFIX}_([0-9a-f]{${API_KEY_PREFIX_BYTES * 2}})_`);

export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0 || a.length % 2 !== 0) return false;
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, ARGON);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash);
}

let dummyHash: string | undefined;

export async function dummyVerify(plain: string): Promise<false> {
  dummyHash ??= await hashPassword(newOpaqueToken(16));
  await Bun.password.verify(plain, dummyHash).catch(() => false);
  return false;
}

export function generateApiKey(pepper: string): GeneratedApiKey {
  const prefix = randomBytes(API_KEY_PREFIX_BYTES).toString("hex");
  const secret = randomBytes(API_KEY_SECRET_BYTES).toString("base64url");
  const full = `${API_KEY_PREFIX}_${prefix}_${secret}`;
  return { full, prefix, hash: hashApiKey(full, pepper) };
}

export function hashApiKey(full: string, pepper: string): string {
  return createHmac("sha256", pepper).update(full, "utf8").digest("hex");
}

export function apiKeyPrefix(full: string): string | null {
  return API_KEY_RE.exec(full)?.[1] ?? null;
}

export function hmacSign(
  secret: string,
  payload: string | Uint8Array,
  timestamp: number,
): string {
  const body =
    typeof payload === "string" ? Buffer.from(payload, "utf8") : Buffer.from(payload);
  return createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");
}

export function hmacVerify(
  secret: string,
  payload: string | Uint8Array,
  timestamp: number,
  signature: string,
  toleranceSeconds = 300,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;
  return constantTimeEqualHex(hmacSign(secret, payload, timestamp), signature);
}
