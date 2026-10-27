import { desc, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { webhookConfig } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { conflict, notFound } from "@wasanni/kit";
import type { UpdateWebhookBody, WebhookConfigView } from "@wasanni/contracts";
import { assertPlatform, assertUrlFree, readWebhook, toWebhookView } from "./webhook-state.ts";

export function createWebhookService(db: Db) {
  return {
    async list(scope: Scope, platformId: string): Promise<WebhookConfigView[]> {
      await assertPlatform(db, scope, platformId);

      const rows = await db
        .select()
        .from(webhookConfig)
        .where(scopeTo(scope, webhookConfig, eq(webhookConfig.platformId, platformId)))
        .orderBy(desc(webhookConfig.createdAt));

      return rows.map(toWebhookView);
    },

    async get(
      scope: Scope,
      platformId: string,
      webhookId: string,
    ): Promise<WebhookConfigView> {
      return toWebhookView(await readWebhook(db, scope, platformId, webhookId));
    },

    async update(
      scope: Scope,
      platformId: string,
      webhookId: string,
      body: UpdateWebhookBody,
    ): Promise<WebhookConfigView> {
      const current = await readWebhook(db, scope, platformId, webhookId);

      if (body.url !== undefined && body.url !== current.url) {
        await assertUrlFree(db, platformId, body.url, webhookId);
      }

      try {
        const [row] = await db
          .update(webhookConfig)
          .set({
            ...(body.url === undefined ? {} : { url: body.url }),
            ...(body.description === undefined ? {} : { description: body.description }),
            ...(body.events === undefined ? {} : { events: body.events }),
            ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
            updatedAt: new Date(),
          })
          .where(scopeTo(scope, webhookConfig, eq(webhookConfig.id, current.id)))
          .returning();

        if (row === undefined) throw notFound("webhook not found");
        return toWebhookView(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict("this platform already has a webhook for that url");
        }
        throw error;
      }
    },

    async remove(scope: Scope, platformId: string, webhookId: string): Promise<void> {
      const current = await readWebhook(db, scope, platformId, webhookId);

      const removed = await db
        .delete(webhookConfig)
        .where(scopeTo(scope, webhookConfig, eq(webhookConfig.id, current.id)))
        .returning({ id: webhookConfig.id });

      if (removed.length === 0) throw notFound("webhook not found");
    },
  };
}
