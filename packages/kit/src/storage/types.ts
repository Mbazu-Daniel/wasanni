import { STORAGE_LOCATIONS } from "./constants.ts";

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export type StorageConfig = {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  readonly publicBaseUrl: string | undefined;
  readonly endpoint?: string;
  readonly forcePathStyle?: boolean;
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
  contentEncoding?: string;
  cacheControl?: string;
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

export type ResolvedContent = {
  contentType: string;
  contentEncoding: string | null;
  servedPath: string;
};

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentEncoding?: string;
  cacheControl?: string;
};

export type GetObjectRangeInput = {
  key: string;
  offset: number;
  length: number;
};

export type ObjectStream = {
  stream: ReadableStream<Uint8Array>;
  status: number;
  contentLength: number | null;
  contentRange: string | null;
  contentType: string;
  contentEncoding: string | null;
  etag: string | null;
};

export interface ObjectStorage {
  createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget>;
  createDownloadUrl(input: DownloadUrlInput): Promise<string>;
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getObjectRange(input: GetObjectRangeInput): Promise<Uint8Array>;
  getObjectStream(key: string, range?: string | null): Promise<ObjectStream | null>;
  publicUrl(key: string): string;
  headObject(key: string): Promise<StoredObject | null>;
  deleteObject(key: string): Promise<void>;
}
