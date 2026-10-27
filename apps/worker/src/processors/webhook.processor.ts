import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { webhookConfig, webhookDelivery } from "@wasanni/db/schema";
import {
  decryptSecret,
  hmacSign,
  InternalServerError,
  newId,
  type Env,
  type Logger,
} from "@wasanni/kit";
import type { WebhookDeliveryJob } from "@wasanni/jobs";

const TIMEOUT_MS = 10_000;

export function createWebhookProcessor(db: Db, env: Env, logger: Logger) {
  return async function deliver(
    job: WebhookDeliveryJob,
    attempt: number,
    isFinalAttempt: boolean,
  ): Promise<unknown> {
    const row = await db.query.webhookConfig.findFirst({
      where: and(
        eq(webhookConfig.id, job.webhookId),
        eq(webhookConfig.organizationId, job.organizationId),
        eq(webhookConfig.platformId, job.platformId),
      ),
    });

    if (row === undefined) {
      logger.warn("webhook.missing", { webhookId: job.webhookId });
      return { skipped: "missing" };
    }

    if (!row.enabled) {
      return { skipped: "disabled" };
    }

    const record = async (input: {
      status: "delivered" | "failed" | "retrying";
      statusCode?: number;
      responseBody?: string;
      error?: string;
      durationMs: number;
    }) => {
      await db
        .insert(webhookDelivery)
        .values({
          id: newId(),
          organizationId: job.organizationId,
          platformId: job.platformId,
          webhookId: job.webhookId,
          eventId: job.eventId,
          eventType: job.eventType,
          attempt,
          status: input.status,
          statusCode: input.statusCode ?? null,
          responseBody: input.responseBody?.slice(0, 1000) ?? null,
          error: input.error?.slice(0, 1000) ?? null,
          durationMs: input.durationMs,
        })
        .catch((error: unknown) =>
          logger.warn("webhook.delivery_log_failed", { err: error }),
        );
    };

    const secret = decryptSecret(
      row.secretCiphertext,
      env.WEBHOOK_SECRET_ENCRYPTION_KEY,
    );

    const body = JSON.stringify({
      id: job.eventId,
      type: job.eventType,
      createdAt: new Date().toISOString(),
      data: job.payload,
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = hmacSign(secret, body, timestamp);
    const startedAt = Date.now();

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
      const message = error instanceof Error ? error.message : String(error);

      await db
        .update(webhookConfig)
        .set({ lastFailureAt: new Date() })
        .where(eq(webhookConfig.id, row.id));

      await record({
        status: isFinalAttempt ? "failed" : "retrying",
        error: message,
        durationMs: Date.now() - startedAt,
      });

      throw error instanceof Error ? error : new Error(message);
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = `webhook responded ${response.status}: ${text.slice(0, 200)}`;

      await db
        .update(webhookConfig)
        .set({ lastFailureAt: new Date() })
        .where(eq(webhookConfig.id, row.id));

      await record({
        status: isFinalAttempt ? "failed" : "retrying",
        statusCode: response.status,
        responseBody: text,
        durationMs,
      });

      throw new InternalServerError(message);
    }

    await db
      .update(webhookConfig)
      .set({ lastDeliveryAt: new Date() })
      .where(eq(webhookConfig.id, row.id));

    await record({
      status: "delivered",
      statusCode: response.status,
      responseBody: await response.text().catch(() => ""),
      durationMs,
    });

    return { status: response.status };
  };
}
