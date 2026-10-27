import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { webhookConfig } from "@wasanni/db/schema";
import type { Enqueuer } from "@wasanni/jobs";
import type { WebhookEvent } from "@wasanni/contracts";

export type WebhookDispatchInput = {
  organizationId: string;
  platformId: string;
  eventType: WebhookEvent;
  payload: unknown;
};

export type WebhookDispatcher = {
  dispatch(input: WebhookDispatchInput): Promise<number>;
};

export function createWebhookDispatcher(
  db: Db,
  enqueuer: Enqueuer | null,
): WebhookDispatcher {
  return {
    async dispatch(input) {
      if (enqueuer === null) return 0;

      const rows = await db
        .select({ id: webhookConfig.id, events: webhookConfig.events })
        .from(webhookConfig)
        .where(
          and(
            eq(webhookConfig.organizationId, input.organizationId),
            eq(webhookConfig.platformId, input.platformId),
            eq(webhookConfig.enabled, true),
          ),
        );

      const subscribed = rows.filter((row) => row.events.includes(input.eventType));
      if (subscribed.length === 0) return 0;

      const eventId = `evt_${crypto.randomUUID()}`;

      await Promise.all(
        subscribed.map((row) =>
          enqueuer.webhookDelivery({
            webhookId: row.id,
            organizationId: input.organizationId,
            platformId: input.platformId,
            eventId,
            eventType: input.eventType,
            payload: input.payload,
          }),
        ),
      );

      return subscribed.length;
    },
  };
}
