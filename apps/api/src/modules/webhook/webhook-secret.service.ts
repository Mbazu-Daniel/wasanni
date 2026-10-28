import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { webhookConfig } from "@wasanni/db/schema";
import { isUniqueViolation, scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  conflict,
  encryptSecret,
  newId,
  notFound,
  randomBytesBase64Url,
} from "@wasanni/kit";
import type { CreateWebhookBody, WebhookConfigView } from "@wasanni/contracts";
import { WEBHOOK_SECRET_BYTES, WEBHOOK_SECRET_PREFIX } from "./constants.ts";
import { assertPlatform, assertUrlFree, readWebhook, toWebhookView } from "./webhook-state.ts";

export type CreatedWebhook = { webhook: WebhookConfigView; secret: string };

export function createWebhookSecretService(db: Db, encryptionKey: string) {
  const mint = (): { secret: string; ciphertext: string; last4: string } => {
    const secret = `${WEBHOOK_SECRET_PREFIX}${randomBytesBase64Url(WEBHOOK_SECRET_BYTES)}`;

    return {
      secret,
      ciphertext: encryptSecret(secret, encryptionKey),
      last4: secret.slice(-4),
    };
  };

  return {
    async create(
      scope: Scope,
      platformId: string,
      body: CreateWebhookBody,
    ): Promise<CreatedWebhook> {
      await assertPlatform(db, scope, platformId);
      await assertUrlFree(db, platformId, body.url);

      const { secret, ciphertext, last4 } = mint();

      try {
        const [row] = await db
          .insert(webhookConfig)
          .values({
            id: newId(),
            organizationId: scope.organizationId,
            platformId,
            url: body.url,
            description: body.description ?? null,
            secretCiphertext: ciphertext,
            secretLast4: last4,
            events: body.events,
            enabled: body.enabled ?? true,
          })
          .returning();

        if (row === undefined) throw notFound("webhook not found");
        return { webhook: toWebhookView(row), secret };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict("this platform already has a webhook for that url");
        }
        throw error;
      }
    },

    async rotate(
      scope: Scope,
      platformId: string,
      webhookId: string,
    ): Promise<CreatedWebhook> {
      const current = await readWebhook(db, scope, platformId, webhookId);
      const { secret, ciphertext, last4 } = mint();

      const [row] = await db
        .update(webhookConfig)
        .set({ secretCiphertext: ciphertext, secretLast4: last4, updatedAt: new Date() })
        .where(scopeTo(scope, webhookConfig, eq(webhookConfig.id, current.id)))
        .returning();

      if (row === undefined) throw notFound("webhook not found");
      return { webhook: toWebhookView(row), secret };
    },
  };
}

export type WebhookSecretService = ReturnType<typeof createWebhookSecretService>;
