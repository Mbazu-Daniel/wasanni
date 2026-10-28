import { BadRequestError } from "../exceptions/index.ts";
import type { ObjectStorage } from "./types.ts";

export type PendingUpload = {
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  expiresAt: Date | null;
};

export const confirmPendingUpload = async (
  storage: ObjectStorage,
  pending: PendingUpload,
  onInvalid: () => Promise<void>,
): Promise<{ etag: string | null }> => {
  if (pending.expiresAt !== null && pending.expiresAt.getTime() < Date.now()) {
    await onInvalid();
    throw new BadRequestError("the upload url has expired");
  }

  const object = await storage.headObject(pending.objectKey);
  if (object === null) throw new BadRequestError("the uploaded object was not found");

  if (object.sizeBytes !== pending.sizeBytes) {
    await onInvalid();
    throw new BadRequestError("the uploaded object does not have the declared size");
  }

  if (object.contentType !== pending.contentType) {
    await onInvalid();
    throw new BadRequestError("the uploaded object does not have the declared content type");
  }

  return { etag: object.etag };
};
