export const STORAGE_LOCATIONS = ["game-bundles", "template-bundles", "session-events"] as const;

export const STORAGE_KEY_SEGMENT_MAX_LENGTH = 80;

export const STORAGE_KEY_FILENAME_MAX_LENGTH = 100;

export const STORAGE_INTERNAL_UPLOAD_TTL_SECONDS = 900;

export const CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  wasm: "application/wasm",
  symbols: "application/json",
  pck: "application/octet-stream",
  data: "application/octet-stream",
  mem: "application/octet-stream",
  unityweb: "application/octet-stream",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
};

export const CONTENT_TYPE_DEFAULT = "application/octet-stream";
