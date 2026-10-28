import type { AvatarUploadTicket } from "@wasanni/contracts";
import { BadRequestError, newId, NotFoundError, type ObjectStorage } from "@wasanni/kit";
import {
  AVATAR_EXTENSIONS,
  AVATAR_KEY_PATTERN,
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  AVATAR_UPLOAD_TTL_SECONDS,
} from "./constants.ts";

export function resolveAvatarKey(
  organizationId: string,
  memberId: string,
  contentType: string,
): string {
  const extension = AVATAR_EXTENSIONS[contentType];
  if (extension === undefined) throw new BadRequestError("unsupported avatar content type");

  return `members/${organizationId}/${memberId}/${newId()}.${extension}`;
}

export function assertAvatarKey(
  key: string,
  organizationId: string,
  memberId: string,
): void {
  if (!AVATAR_KEY_PATTERN.test(key)) {
    throw new NotFoundError("that avatar key is not one this api issued");
  }

  if (!key.startsWith(`members/${organizationId}/${memberId}/`)) {
    throw new NotFoundError("that avatar key belongs to another member");
  }
}

export async function createAvatarUploadTicket(
  storage: ObjectStorage,
  organizationId: string,
  memberId: string,
  contentType: string,
): Promise<AvatarUploadTicket> {
  if (!AVATAR_TYPES.includes(contentType as (typeof AVATAR_TYPES)[number])) {
    throw new BadRequestError("unsupported avatar content type");
  }

  const key = resolveAvatarKey(organizationId, memberId, contentType);

  const target = await storage.createUploadTarget({
    key,
    contentType,
    expiresInSeconds: AVATAR_UPLOAD_TTL_SECONDS,
  });

  return {
    uploadUrl: target.url,
    key,
    expiresAt: target.expiresAt,
    maxBytes: AVATAR_MAX_BYTES,
    allowedTypes: [...AVATAR_TYPES],
  };
}
