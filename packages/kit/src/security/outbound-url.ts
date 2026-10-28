import { lookup } from "node:dns/promises";
import { BadRequestError } from "../exceptions/index.ts";

const ipv4ToNumber = (value: string): number | null => {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts.reduce((result, part) => result * 256 + part, 0);
};

const privateIpv4 = (value: string): boolean => {
  const number = ipv4ToNumber(value);
  if (number === null) return false;
  const first = number >>> 24;
  const second = (number >>> 16) & 255;
  return first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && second >= 18 && second <= 19);
};

const privateIpv6 = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("ff") ||
    (normalized.startsWith("::ffff:") && privateIpv4(normalized.slice(7)));
};

const isPrivateAddress = (address: string): boolean =>
  address.includes(":") ? privateIpv6(address) : privateIpv4(address);

export async function assertSafeOutboundUrl(
  raw: string,
  allowPrivateOutbound = false,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestError("the outbound url is invalid");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username !== "" || url.password !== "") {
    throw new BadRequestError("the outbound url is not allowed");
  }
  if (allowPrivateOutbound) return url;
  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new BadRequestError("the outbound url is not allowed");
    }
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("the outbound url could not be resolved");
  }
  return url;
}
