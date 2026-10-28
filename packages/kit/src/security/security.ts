import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { API_KEY_PREFIX, API_KEY_RANDOM_BYTES } from "./constants.ts";
import { InternalServerError } from "../exceptions/index.ts";

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

export function randomBytesBase64Url(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export function hmacSign(secret: string, body: string, timestamp: number): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
}

function encryptionKey(keyMaterial: string): Buffer {
  return createHash("sha256").update(keyMaterial, "utf8").digest();
}

export function encryptSecret(plaintext: string, keyMaterial: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string, keyMaterial: string): string {
  const parts = payload.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new InternalServerError("the secret payload is malformed");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyMaterial),
    Buffer.from(parts[1]!, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(parts[2]!, "base64url"));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3]!, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new InternalServerError("the secret payload does not authenticate");
  }
}
