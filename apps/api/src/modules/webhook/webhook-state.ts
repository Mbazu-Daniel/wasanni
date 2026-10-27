import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { platform, webhookConfig } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { conflict, notFound } from "@wasanni/kit";
import type { WebhookConfigView } from "@wasanni/contracts";

export type WebhookRow = (typeof webhookConfig.$inferSelect);

export const toWebhookView = (row: WebhookRow): WebhookConfigView => ({
  id: row.id,
  organizationId: row.organizationId,
  platformId: row.platformId,
  url: row.url,
  description: row.description,
  secretLast4: row.secretLast4,
  events: row.events,
  enabled: row.enabled,
  lastDeliveryAt: row.lastDeliveryAt === null ? null : row.lastDeliveryAt.toISOString(),
  lastFailureAt: row.lastFailureAt === null ? null : row.lastFailureAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export async function readWebhook(
  db: Db,
  scope: Scope,
  platformId: string,
  webhookId: string,
): Promise<WebhookRow> {
  const [row] = await db
    .select()
    .from(webhookConfig)
    .where(
      scopeTo(
        scope,
        webhookConfig,
        eq(webhookConfig.id, webhookId),
        eq(webhookConfig.platformId, platformId),
      ),
    )
    .limit(1);

  if (row === undefined) throw notFound("webhook not found");
  return row;
}

export async function assertPlatform(
  db: Db,
  scope: Scope,
  platformId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: platform.id })
    .from(platform)
    .where(scopeTo(scope, platform, eq(platform.id, platformId)))
    .limit(1);

  if (row === undefined) throw notFound("platform not found");
}

export async function assertUrlFree(
  db: Db,
  platformId: string,
  url: string,
  exceptId?: string,
): Promise<void> {
  const clash = await db
    .select({ id: webhookConfig.id })
    .from(webhookConfig)
    .where(
      and(
        eq(webhookConfig.platformId, platformId),
        eq(webhookConfig.url, url),
        exceptId === undefined ? undefined : ne(webhookConfig.id, exceptId),
      ),
    )
    .limit(1);

  if (clash.length > 0) {
    throw conflict("this platform already has a webhook for that url");
  }
}
