import { AwsClient } from "aws4fetch";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  AVATAR_UPLOAD_TTL_SECONDS,
} from "./constants.ts";
import type {
  AvatarUploadRequest,
  PresignedUpload,
  StorageConfig,
} from "./types.ts";
import { r2PublicBaseUrl } from "./types.ts";
import { badRequest } from "../errors/errors.ts";
import { newId } from "../publicid/publicid.ts";
import type { Env } from "../config/types.ts";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function endpoint(config: StorageConfig): string {
  return `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
}

export function avatarKeyFor(organizationId: string, memberId: string, contentType: string): string {
  const extension = EXTENSIONS[contentType];
  if (extension === undefined) throw badRequest("unsupported avatar content type");
  return `members/${organizationId}/${memberId}/${newId()}.${extension}`;
}

export function avatarUrlFor(config: StorageConfig, key: string): string {
  const base = config.publicBaseUrl?.replace(/\/$/, "");
  return base === undefined ? `${endpoint(config)}/${key}` : `${base}/${key}`;
}

export function storageConfigured(
  config: StorageConfig | undefined,
): config is StorageConfig {
  return config !== undefined;
}

export function storageFromEnv(env: Env): StorageConfig | undefined {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;

  if (
    R2_ACCOUNT_ID === undefined ||
    R2_ACCESS_KEY_ID === undefined ||
    R2_SECRET_ACCESS_KEY === undefined ||
    R2_BUCKET_NAME === undefined
  ) {
    return undefined;
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET_NAME,
    publicBaseUrl: r2PublicBaseUrl(env.R2_PUBLIC_ID, env.R2_CUSTOM_DOMAIN),
  };
}

export async function presignAvatarUpload(
  config: StorageConfig,
  request: AvatarUploadRequest,
): Promise<PresignedUpload> {
  if (!AVATAR_TYPES.includes(request.contentType as (typeof AVATAR_TYPES)[number])) {
    throw badRequest("unsupported avatar content type");
  }

  const key = avatarKeyFor(request.organizationId, request.memberId, request.contentType);
  const expiresAt = new Date(Date.now() + AVATAR_UPLOAD_TTL_SECONDS * 1000);

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const signed = await client.sign(
    new Request(`${endpoint(config)}/${key}`, {
      method: "PUT",
      headers: { "content-type": request.contentType },
    }),
    {
      aws: { signQuery: true, allHeaders: true, datetime: expiresAt.toISOString() },
    },
  );

  return {
    uploadUrl: signed.url,
    key,
    expiresAt: expiresAt.toISOString(),
    maxBytes: AVATAR_MAX_BYTES,
    allowedTypes: [...AVATAR_TYPES],
  };
}
