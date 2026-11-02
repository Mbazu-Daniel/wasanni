import { decryptSecret, encryptSecret } from "@wasanni/kit";

const encryptedOf = (metadata: unknown): string | null => {
  const parsed: unknown = typeof metadata === "string" ? JSON.parse(metadata) : metadata;

  if (typeof parsed !== "object" || parsed === null) return null;
  if (!("encrypted" in parsed)) return null;

  return typeof parsed.encrypted === "string" ? parsed.encrypted : null;
};

export const encryptKeyMetadata = (
  platformId: string,
  encryptionKey: string,
): { readonly encrypted: string } => ({
  encrypted: encryptSecret(JSON.stringify({ platformId }), encryptionKey),
});

export const platformIdFromMetadata = (
  metadata: unknown,
  encryptionKey: string,
): string | null => {
  const encrypted = encryptedOf(metadata);
  if (encrypted === null) return null;

  const payload: unknown = JSON.parse(decryptSecret(encrypted, encryptionKey));

  if (typeof payload !== "object" || payload === null) return null;
  if (!("platformId" in payload)) return null;

  return typeof payload.platformId === "string" ? payload.platformId : null;
};
