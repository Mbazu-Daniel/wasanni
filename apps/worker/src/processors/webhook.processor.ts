import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { webhookConfig } from "@wasanni/db/schema";
import { decryptSecret, hmacSign, internal, type Env, type Logger } from "@wasanni/kit";
import type { WebhookDeliveryJob } from "@wasanni/jobs";

const TIMEOUT_MS = 10_000;

export function createWebhookProcessor(db: Db, env: Env, logger: Logger) {
  const markFailure = async (webhookId: string): Promise<void> => {
    await db
      .update(webhookConfig)
      .set({ lastFailureAt: new Date() })
      .where(eq(webhookConfig.id, webhookId));
  };

  return async function deliver(job: WebhookDeliveryJob): Promise<unknown> {
    const [row] = await db
      .select()
      .from(webhookConfig)
      .where(
        and(
          eq(webhookConfig.id, job.webhookId),
          eq(webhookConfig.organizationId, job.organizationId),
          eq(webhookConfig.platformId, job.platformId),
        ),
      )
      .limit(1);

    if (row === undefined) {
      logger.warn("webhook.missing", { webhookId: job.webhookId });
      return { skipped: "missing" };
    }

    if (!row.enabled) return { skipped: "disabled" };

    const secret = decryptSecret(row.secretCiphertext, env.WEBHOOK_SECRET_ENCRYPTION_KEY);

    const body = JSON.stringify({
      id: job.eventId,
      type: job.eventType,
      createdAt: new Date().toISOString(),
      data: job.payload,
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = hmacSign(secret, body, timestamp);

    let response: Response;

    try {
      response = await fetch(row.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Wasanni-Webhooks/1",
          "x-wasanni-event-id": job.eventId,
          "x-wasanni-event-type": job.eventType,
          "x-wasanni-timestamp": String(timestamp),
          "x-wasanni-signature": `t=${timestamp},v1=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      await markFailure(row.id);
      throw error instanceof Error ? error : new Error(String(error));
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      await markFailure(row.id);
      throw internal(`webhook responded ${response.status}: ${text.slice(0, 200)}`);
    }

    await db
      .update(webhookConfig)
      .set({ lastDeliveryAt: new Date() })
      .where(eq(webhookConfig.id, row.id));

    return { status: response.status };
  };
}
