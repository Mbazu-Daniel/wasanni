import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { outboxEvent, webhookConfig } from "@wasanni/db/schema";
import type { Enqueuer } from "@wasanni/jobs";
import type { Logger } from "@wasanni/kit";

const BATCH_SIZE = 200;

const errorMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, 2000);

export function createOutboxProcessor(db: Db, enqueuer: Enqueuer, logger: Logger) {
  return async function publish(): Promise<{ published: number; failed: number }> {
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(outboxEvent)
        .where(eq(outboxEvent.status, "pending"))
        .orderBy(asc(outboxEvent.createdAt))
        .limit(BATCH_SIZE)
        .for("update", { skipLocked: true });

      if (rows.length === 0) return { published: 0, failed: 0 };

      const now = new Date();
      let published = 0;
      let failed = 0;

      for (const row of rows) {
        try {
          const subscribers = await tx
            .select({ id: webhookConfig.id, events: webhookConfig.events })
            .from(webhookConfig)
            .where(
              and(
                eq(webhookConfig.organizationId, row.organizationId),
                eq(webhookConfig.platformId, row.platformId),
                eq(webhookConfig.enabled, true),
                or(
                  isNull(webhookConfig.expiresAt),
                  gt(webhookConfig.expiresAt, now),
                ),
              ),
            );

          for (const subscriber of subscribers) {
            if (!subscriber.events.some((event) => event === row.eventType)) continue;

            await enqueuer.webhookDelivery({
              webhookId: subscriber.id,
              organizationId: row.organizationId,
              platformId: row.platformId,
              eventId: row.id,
              eventType: row.eventType,
              payload: row.payload,
            });
          }

          await tx
            .update(outboxEvent)
            .set({
              status: "published",
              publishedAt: now,
              attempts: sql`${outboxEvent.attempts} + 1`,
            })
            .where(eq(outboxEvent.id, row.id));

          published += 1;
        } catch (error) {
          await tx
            .update(outboxEvent)
            .set({
              attempts: sql`${outboxEvent.attempts} + 1`,
              lastError: errorMessage(error),
            })
            .where(eq(outboxEvent.id, row.id));

          failed += 1;
          logger.warn("outbox.row_failed", { eventId: row.id, err: errorMessage(error) });
        }
      }

      if (published > 0) logger.info("outbox.published", { published });

      return { published, failed };
    });
  };
}
