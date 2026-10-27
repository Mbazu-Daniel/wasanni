export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const AVATAR_UPLOAD_TTL_SECONDS = 300;

export const R2_KEY_PATTERN = /^members\/[^/]+\/[^/]+\/[0-9a-f-]{36}\.[a-z0-9]+$/;
