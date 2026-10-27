export const QUEUE = {
  WEBHOOKS: "webhooks",
  EMAIL: "email",
  ARCHIVE: "archive",
  DEFAULT: "default",
} as const;

export const JOB = {
  WEBHOOK_DELIVER: "webhook.deliver",
  EMAIL_SEND: "email.send",
  SCORE_PACK: "score.pack",
  SCORE_RECHECK: "score.recheck",
  SCORE_ARCHIVE_PARTITIONS: "score.archive_partitions",
  SCORE_ENSURE_PARTITIONS: "score.ensure_partitions",
  SESSION_SWEEP: "session.sweep",
} as const;

export const PACK_DELAY_MS = 60_000;

export const PACK_DEDUPLICATION_TTL_MS = 60_000;
