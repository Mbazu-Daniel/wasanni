import {
  BadRequestError,
  NotFoundError,
  newId,
  type ObjectStorage,
} from "@wasanni/kit";
import type { ImageUploadTicket } from "@wasanni/contracts";

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_UPLOAD_TTL_SECONDS = 300;

export const IMAGE_KEY_PATTERN =
  /^[^/]+\/(games|tournaments)\/[0-9a-f-]{36}\.[a-z0-9]+$/;

export const imageKeyPrefix = (
  organizationId: string,
  folder: "games" | "tournaments",
): string => `${organizationId}/${folder}/`;

export const assertImageKey = (
  key: string,
  organizationId: string,
  folder: "games" | "tournaments",
): void => {
  if (!IMAGE_KEY_PATTERN.test(key)) {
    throw new NotFoundError("that image key is not one this api issued");
  }

  if (!key.startsWith(imageKeyPrefix(organizationId, folder))) {
    throw new NotFoundError("that image key belongs to another organization");
  }
};

export const resolveImageKey = (
  organizationId: string,
  folder: "games" | "tournaments",
  contentType: string,
): string => {
  const extension = IMAGE_EXTENSIONS[contentType];
  if (extension === undefined) {
    throw new BadRequestError("unsupported image content type");
  }

  return `${imageKeyPrefix(organizationId, folder)}${newId()}.${extension}`;
};

export const createImageUploadTicket = async (
  storage: ObjectStorage,
  organizationId: string,
  folder: "games" | "tournaments",
  contentType: string,
): Promise<ImageUploadTicket> => {
  if (
    !IMAGE_TYPES.includes(contentType as (typeof IMAGE_TYPES)[number])
  ) {
    throw new BadRequestError("unsupported image content type");
  }

  const key = resolveImageKey(organizationId, folder, contentType);

  const target = await storage.createUploadTarget({
    key,
    contentType,
    expiresInSeconds: IMAGE_UPLOAD_TTL_SECONDS,
  });

  return {
    uploadUrl: target.url,
    key,
    expiresAt: target.expiresAt,
    maxBytes: IMAGE_MAX_BYTES,
    allowedTypes: [...IMAGE_TYPES],
  };
};
