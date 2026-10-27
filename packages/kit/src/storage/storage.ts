import { AwsClient } from "aws4fetch";
import { BadRequestError, InternalServerError } from "../exceptions/index.ts";
import type { Env } from "../config/types.ts";
import { STORAGE_INTERNAL_UPLOAD_TTL_SECONDS } from "./constants.ts";
import type {
  CreateUploadTargetInput,
  DownloadUrlInput,
  GetObjectRangeInput,
  ObjectStorage,
  PutObjectInput,
  StorageConfig,
  StoredObject,
  UploadTarget,
} from "./types.ts";

function resolvePublicBaseUrl(
  publicId: string | undefined,
  customDomain: string | undefined,
): string | undefined {
  if (customDomain !== undefined && customDomain !== "") return `https://${customDomain}`;
  if (publicId !== undefined && publicId !== "") return `https://${publicId}.r2.dev`;
  return undefined;
}

export function readStorageConfig(env: Env): StorageConfig | undefined {
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
    publicBaseUrl: resolvePublicBaseUrl(env.R2_PUBLIC_ID, env.R2_CUSTOM_DOMAIN),
  };
}

function resolveObjectEndpoint(config: StorageConfig): string {
  return `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
}

function resolveSigningTimestamp(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function createUnconfiguredObjectStorage(): ObjectStorage {
  const reject = (): Promise<never> =>
    Promise.reject(new BadRequestError("object storage is not configured"));

  return {
    createUploadTarget: reject,
    createDownloadUrl: reject,
    putObject: reject,
    getObjectRange: reject,
    publicUrl: () => {
      throw new BadRequestError("object storage is not configured");
    },
    headObject: reject,
    deleteObject: reject,
  };
}

export function createObjectStorage(config: StorageConfig | undefined): ObjectStorage {
  if (config === undefined) return createUnconfiguredObjectStorage();

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const resolveObjectUrl = (key: string): string => `${resolveObjectEndpoint(config)}/${key}`;

  const createUploadTarget = async (input: CreateUploadTargetInput): Promise<UploadTarget> => {
    const url = new URL(resolveObjectUrl(input.key));
    url.searchParams.set("X-Amz-Expires", String(input.expiresInSeconds));

    const headers: Record<string, string> = { "content-type": input.contentType };
    if (input.sizeBytes !== undefined) headers["content-length"] = String(input.sizeBytes);

    const signed = await client.sign(url.toString(), {
      method: "PUT",
      headers,
      aws: { signQuery: true, allHeaders: true, datetime: resolveSigningTimestamp() },
    });

    return {
      key: input.key,
      url: signed.url,
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      sizeBytes: input.sizeBytes ?? 0,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
    };
  };

  const createDownloadUrl = async (input: DownloadUrlInput): Promise<string> => {
    const url = new URL(resolveObjectUrl(input.key));
    url.searchParams.set("X-Amz-Expires", String(input.expiresInSeconds));

    const signed = await client.sign(url.toString(), {
      method: "GET",
      aws: { signQuery: true, allHeaders: true, datetime: resolveSigningTimestamp() },
    });

    return signed.url;
  };

  return {
    createUploadTarget,

    createDownloadUrl,

    async putObject(input: PutObjectInput): Promise<StoredObject> {
      const target = await createUploadTarget({
        key: input.key,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        expiresInSeconds: STORAGE_INTERNAL_UPLOAD_TTL_SECONDS,
      });

      const response = await fetch(target.url, {
        method: "PUT",
        headers: target.headers,
        body: input.body,
      });

      if (!response.ok) throw new InternalServerError("object storage could not store the object");

      return {
        key: input.key,
        sizeBytes: input.body.byteLength,
        contentType: input.contentType,
        etag: response.headers.get("etag")?.replaceAll('"', "") ?? null,
        lastModified: new Date(),
      };
    },

    async getObjectRange(input: GetObjectRangeInput): Promise<Uint8Array> {
      if (input.length <= 0) return new Uint8Array(0);

      const url = await createDownloadUrl({
        key: input.key,
        expiresInSeconds: STORAGE_INTERNAL_UPLOAD_TTL_SECONDS,
      });

      const response = await fetch(url, {
        headers: { Range: `bytes=${input.offset}-${input.offset + input.length - 1}` },
      });

      if (!response.ok) throw new InternalServerError("object storage could not read the object");

      return new Uint8Array(await response.arrayBuffer());
    },

    publicUrl(key: string): string {
      const base = config.publicBaseUrl?.replace(/\/$/, "");

      return base === undefined ? resolveObjectUrl(key) : `${base}/${key}`;
    },

    async headObject(key: string): Promise<StoredObject | null> {
      const response = await client.fetch(new Request(resolveObjectUrl(key), { method: "HEAD" }));

      if (response.status === 404) return null;
      if (!response.ok) throw new InternalServerError("object storage could not be reached");

      const length = response.headers.get("content-length");
      const modified = response.headers.get("last-modified");

      return {
        key,
        sizeBytes: length === null ? 0 : Number(length),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        etag: response.headers.get("etag")?.replaceAll('"', "") ?? null,
        lastModified: modified === null ? null : new Date(modified),
      };
    },

    async deleteObject(key: string): Promise<void> {
      const response = await client.fetch(new Request(resolveObjectUrl(key), { method: "DELETE" }));

      if (!response.ok) throw new InternalServerError("object storage could not delete the object");
    },
  };
}
