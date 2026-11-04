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

const KEY_TAIL_PATTERN = /^[0-9a-f-]{36}\.[a-z0-9]+$/;

const issuedExtensions = (): readonly string[] => Object.values(IMAGE_EXTENSIONS);

export const resolveImageKey = (prefix: string, contentType: string): string => {
  const extension = IMAGE_EXTENSIONS[contentType];
  if (extension === undefined) throw new BadRequestError("unsupported image content type");

  return `${prefix}${newId()}.${extension}`;
};

export const assertImageKey = (key: string, prefix: string): void => {
  if (!key.startsWith(prefix)) {
    throw new NotFoundError("that image key is not one this api issued");
  }

  const tail = key.slice(prefix.length);
  const extension = tail.split(".").pop() ?? "";

  if (!KEY_TAIL_PATTERN.test(tail) || !issuedExtensions().includes(extension)) {
    throw new NotFoundError("that image key is not one this api issued");
  }
};

export const createImageUploadTicket = async (
  storage: ObjectStorage,
  prefix: string,
  contentType: string,
): Promise<ImageUploadTicket> => {
  if (!IMAGE_TYPES.includes(contentType as (typeof IMAGE_TYPES)[number])) {
    throw new BadRequestError("unsupported image content type");
  }

  const key = resolveImageKey(prefix, contentType);

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

export const assertImageUploaded = async (
  storage: ObjectStorage,
  key: string,
): Promise<void> => {
  if ((await storage.headObject(key)) === null) {
    throw new BadRequestError("that image has not been uploaded");
  }
};
