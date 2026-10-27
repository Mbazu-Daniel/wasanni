export const NODE_ENVS = ["development", "test", "production"] as const;

export const DEFAULT_NODE_ENV = "development";
export const DEFAULT_PORT = 3000;
export const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

export const PORT_RANGE = { min: 1, max: 65535 } as const;
export const SECRET_MIN_LENGTH = 32;

export const DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS = 900;
export const DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS = 3600;
export const DEFAULT_STORAGE_MAX_GAME_BUNDLE_BYTES = 209_715_200;

export const STORAGE_URL_TTL_RANGE = { min: 60, max: 86_400 } as const;
export const STORAGE_MAX_GAME_BUNDLE_BYTES_RANGE = { min: 1024, max: 5_368_709_120 } as const;

export const DEFAULT_EMAIL_FROM_ADDRESS = "no-reply@wasanni.com";
export const DEFAULT_EMAIL_FROM_NAME = "Wasanni";

export const DEFAULT_REALTIME_PORT = 3001;
export const DEFAULT_REALTIME_PUBLIC_URL = "ws://localhost:3001";
export const DEFAULT_WS_IDLE_TIMEOUT_SECONDS = 120;
export const DEFAULT_WS_MAX_MESSAGE_BYTES = 65_536;

export const WS_IDLE_TIMEOUT_RANGE = { min: 10, max: 3600 } as const;
export const WS_MAX_MESSAGE_BYTES_RANGE = { min: 256, max: 1_048_576 } as const;


export const DEFAULT_SCORE_PARTITIONING_ENABLED = false;
export const DEFAULT_SCORE_PARTITION_PREMAKE_HOURS = 24;
export const DEFAULT_SCORE_ARCHIVE_ENABLED = false;
export const DEFAULT_SCORE_ARCHIVE_CRON = "0 3 * * *";
export const DEFAULT_SCORE_ARCHIVE_RETENTION_HOURS = 168;
export const DEFAULT_SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN = 24;
export const DEFAULT_SCORE_ARCHIVE_DRY_RUN = true;

export const SCORE_PARTITION_PREMAKE_RANGE = { min: 1, max: 168 } as const;
export const SCORE_ARCHIVE_RETENTION_RANGE = { min: 1, max: 8760 } as const;
export const SCORE_ARCHIVE_MAX_PARTITIONS_RANGE = { min: 1, max: 168 } as const;

export const DEFAULT_SCORE_RATE_LIMIT_PER_MINUTE = 120;
export const DEFAULT_SESSION_RATE_LIMIT_PER_MINUTE = 600;
export const RATE_LIMIT_RANGE = { min: 1, max: 100_000 } as const;

export const DEFAULT_GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES = 1_073_741_824;
export const DEFAULT_GAME_BUNDLE_MAX_FILES = 20_000;

export const DEFAULT_USAGE_METERING_ENABLED = true;
export const DEFAULT_SCORE_VERIFICATION_ENABLED = true;
export const GAME_BUNDLE_MAX_UNCOMPRESSED_RANGE = {
  min: 1_048_576,
  max: 5_368_709_120,
} as const;
export const GAME_BUNDLE_MAX_FILES_RANGE = { min: 1, max: 100_000 } as const;

export const DEFAULT_DB_POOL_MAX = 10;
export const DEFAULT_DB_POOL_MAX_WORKER = 5;
export const DEFAULT_DB_POOL_MAX_REALTIME = 5;
export const DEFAULT_FD_LIMIT_MINIMUM = 65_535;

export const DB_POOL_RANGE = { min: 1, max: 50 } as const;
export const FD_LIMIT_RANGE = { min: 1024, max: 1_048_576 } as const;
