export const EXPORT_ROW_LIMIT = 10_000;

export const ORGANIZATION_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const ORGANIZATION_LOGO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const ORGANIZATION_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export const ORGANIZATION_LOGO_UPLOAD_TTL_SECONDS = 300;
