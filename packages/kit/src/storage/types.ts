export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  expiresAt: string;
  maxBytes: number;
  allowedTypes: string[];
};

export type StorageConfig = {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  readonly publicBaseUrl: string | undefined;
};

export function r2PublicBaseUrl(
  publicId: string | undefined,
  customDomain: string | undefined,
): string | undefined {
  if (customDomain !== undefined && customDomain !== "") return `https://${customDomain}`;
  if (publicId !== undefined && publicId !== "") return `https://${publicId}.r2.dev`;
  return undefined;
}

export type AvatarUploadRequest = {
  organizationId: string;
  memberId: string;
  contentType: string;
};
