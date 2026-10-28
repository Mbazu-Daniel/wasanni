import { t, type UnwrapSchema } from "elysia";

export const GAME_FILE_KIND = ["single", "bundle"] as const;
export type GameFileKind = (typeof GAME_FILE_KIND)[number];

export const GameFileKindModel = t.Union([
  t.Literal("single"),
  t.Literal("bundle"),
]);

export const GameFileStatus = t.Union([
  t.Literal("pending_upload"),
  t.Literal("extracting"),
  t.Literal("ready"),
  t.Literal("failed"),
]);
export type GameFileStatus = UnwrapSchema<typeof GameFileStatus>;

export const GameFileView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  gameId: t.String(),
  version: t.String(),
  sizeBytes: t.Number(),
  contentType: t.String(),
  etag: t.Union([t.String(), t.Null()]),
  status: GameFileStatus,
  kind: GameFileKindModel,
  entryPoint: t.String(),
  crossOriginIsolation: t.Boolean(),
  spaFallback: t.Boolean(),
  servedPrefix: t.Union([t.String(), t.Null()]),
  isCurrent: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  readyAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  uploadExpiresAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type GameFileView = UnwrapSchema<typeof GameFileView>;

export const GameFileSingle = t.Object({ file: GameFileView });
export type GameFileSingle = UnwrapSchema<typeof GameFileSingle>;

export const GameFileList = t.Object({ files: t.Array(GameFileView) });
export type GameFileList = UnwrapSchema<typeof GameFileList>;

export const UploadTarget = t.Object({
  key: t.String(),
  url: t.String(),
  method: t.Literal("PUT"),
  headers: t.Record(t.String(), t.String()),
  sizeBytes: t.Number(),
  expiresAt: t.String({ format: "date-time" }),
});
export type UploadTarget = UnwrapSchema<typeof UploadTarget>;

export const CreateGameFileBody = t.Object({
  filename: t.String({ minLength: 1, maxLength: 200 }),
  version: t.String({ minLength: 1, maxLength: 40 }),
  contentType: t.String({ minLength: 1, maxLength: 120 }),
  sizeBytes: t.Number({ minimum: 1, maximum: 5_368_709_120 }),
  kind: t.Optional(GameFileKindModel),
  entryPoint: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  crossOriginIsolation: t.Optional(t.Boolean()),
  spaFallback: t.Optional(t.Boolean()),
});
export type CreateGameFileBody = UnwrapSchema<typeof CreateGameFileBody>;

export const GameFileUpload = t.Object({
  file: GameFileView,
  upload: UploadTarget,
});
export type GameFileUpload = UnwrapSchema<typeof GameFileUpload>;

export const GameFileIdParams = t.Object({
  organizationId: t.String(),
  gameId: t.String(),
  fileId: t.String(),
});
export type GameFileIdParams = UnwrapSchema<typeof GameFileIdParams>;

export const PlatformGameFileParams = t.Object({
  gameId: t.String(),
  fileId: t.String(),
});
export type PlatformGameFileParams = UnwrapSchema<typeof PlatformGameFileParams>;

export const DownloadUrlSingle = t.Object({ url: t.String() });
export type DownloadUrlSingle = UnwrapSchema<typeof DownloadUrlSingle>;
