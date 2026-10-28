import type { Queues } from "./queues.ts";
import { JOB, PACK_DELAY_MS, PACK_DEDUPLICATION_TTL_MS } from "./names.ts";
import type {
  EmailJob,
  ScorePackJob,
  ScoreRecheckJob,
  WebhookDeliveryJob,
} from "./types.ts";

export function createEnqueuer(queues: Queues) {
  return {
    async webhookDelivery(job: WebhookDeliveryJob) {
      return queues.webhooks.add(JOB.WEBHOOK_DELIVER, job, {
        jobId: `whd-${job.webhookId}-${job.eventId}`,
      });
    },

    async email(job: EmailJob) {
      return queues.email.add(JOB.EMAIL_SEND, job);
    },

    async scorePackNow(organizationId: string) {
      return queues.archive.add(JOB.SCORE_PACK, { organizationId } satisfies ScorePackJob, {
        delay: PACK_DELAY_MS,
        deduplication: { id: `pack-${organizationId}`, ttl: PACK_DEDUPLICATION_TTL_MS },
      });
    },

    async scorePackSweep() {
      return queues.archive.add(JOB.SCORE_PACK, {} satisfies ScorePackJob);
    },

    async scoreRecheck(job: ScoreRecheckJob) {
      return queues.archive.add(JOB.SCORE_RECHECK, job, {
        jobId: `rchk-${job.configId}-${Math.floor(Date.now() / 60_000)}`,
      });
    },

    async sessionSweep() {
      return queues.default.add(JOB.SESSION_SWEEP, {});
    },
  };
}

export type Enqueuer = ReturnType<typeof createEnqueuer>;
