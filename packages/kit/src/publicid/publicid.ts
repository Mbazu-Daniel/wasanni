import { randomBytes } from "node:crypto";
import { ID_PREFIXES } from "@wasanni/contracts";
import type { IdPrefix } from "@wasanni/contracts";
import { badRequest } from "../errors/errors.ts";
import { ALPHABET, ID_RE, MIN_ID_CHARS } from "./constants.ts";

export { ID_PREFIXES };
export type { IdPrefix };

const PREFIX_SET: ReadonlySet<string> = new Set(ID_PREFIXES);

const BITS_PER_BYTE = 8;
const BITS_PER_CHARACTER = 5;
const CHARACTER_MASK = (1 << BITS_PER_CHARACTER) - 1;

export function newId(prefix: IdPrefix, length = MIN_ID_CHARS): string {
  if (length < MIN_ID_CHARS) {
    throw new Error(`public ids need at least ${MIN_ID_CHARS} characters`);
  }

  const byteCount = Math.ceil((length * BITS_PER_CHARACTER) / BITS_PER_BYTE);
  const bytes = randomBytes(byteCount);

  let bitBuffer = 0;
  let bitsInBuffer = 0;
  let body = "";

  for (const byte of bytes) {
    if (body.length >= length) break;

    bitBuffer = (bitBuffer << BITS_PER_BYTE) | byte;
    bitsInBuffer += BITS_PER_BYTE;

    while (bitsInBuffer >= BITS_PER_CHARACTER && body.length < length) {
      bitsInBuffer -= BITS_PER_CHARACTER;
      body += ALPHABET[(bitBuffer >>> bitsInBuffer) & CHARACTER_MASK]!;
    }
  }

  return `${prefix}_${body}`;
}

export function parseId(id: string): { prefix: IdPrefix; body: string } | null {
  const match = ID_RE.exec(id);
  if (!match) return null;

  const prefix = match[1]!;
  const body = match[2]!;

  if (!PREFIX_SET.has(prefix)) return null;

  return { prefix: prefix as IdPrefix, body };
}

export function isId(id: string, prefix?: IdPrefix): boolean {
  const parsed = parseId(id);
  if (!parsed) return false;
  return prefix === undefined || parsed.prefix === prefix;
}

export function assertId(id: string, prefix: IdPrefix): string {
  if (!isId(id, prefix)) throw badRequest(`invalid id: expected ${prefix}_…`);
  return id;
}
