import { STORAGE_LOCATIONS } from "./constants.ts";

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export type StorageConfig = {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  readonly publicBaseUrl: string | undefined;
};

export type UploadTarget = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  sizeBytes: number;
  expiresAt: string;
};

export type CreateUploadTargetInput = {
  key: string;
  contentType: string;
  sizeBytes?: number;
  expiresInSeconds: number;
};

export type DownloadUrlInput = {
  key: string;
  expiresInSeconds: number;
};

export type StoredObject = {
  key: string;
  sizeBytes: number;
  contentType: string;
  etag: string | null;
  lastModified: Date | null;
};

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export type GetObjectRangeInput = {
  key: string;
  offset: number;
  length: number;
};

export interface ObjectStorage {
  createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget>;
  createDownloadUrl(input: DownloadUrlInput): Promise<string>;
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getObjectRange(input: GetObjectRangeInput): Promise<Uint8Array>;
  publicUrl(key: string): string;
  headObject(key: string): Promise<StoredObject | null>;
  deleteObject(key: string): Promise<void>;
}
