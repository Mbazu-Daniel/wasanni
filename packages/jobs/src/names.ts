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
  GAME_BUNDLE_EXTRACT: "game.bundle.extract",
  USAGE_FLUSH: "usage.flush",
  SESSION_SWEEP: "session.sweep",
  OUTBOX_PUBLISH: "outbox.publish",
} as const;

export const PACK_DELAY_MS = 60_000;

export const PACK_DEDUPLICATION_TTL_MS = 60_000;

export type JobSchedule = {
  readonly key: string;
  readonly queue: "archive" | "default";
  readonly job: string;
  readonly repeat: { every: number } | { pattern: string; tz: string };
};

export const SCHEDULES: readonly JobSchedule[] = [
  {
    key: "score-partition-maintenance",
    queue: "archive",
    job: JOB.SCORE_ENSURE_PARTITIONS,
    repeat: { pattern: "5 * * * *", tz: "UTC" },
  },
  {
    key: "session-sweep",
    queue: "default",
    job: JOB.SESSION_SWEEP,
    repeat: { every: 60 * 1000 },
  },
  {
    key: "usage-flush",
    queue: "default",
    job: JOB.USAGE_FLUSH,
    repeat: { pattern: "* * * * *", tz: "UTC" },
  },
  {
    key: "outbox-publish",
    queue: "default",
    job: JOB.OUTBOX_PUBLISH,
    repeat: { every: 5_000 },
  },
];
