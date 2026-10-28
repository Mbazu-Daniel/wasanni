import { t, type UnwrapSchema } from "elysia";

export const WEBHOOK_EVENTS = [
  "score.submitted",
  "score.hidden",
  "score.rejected",
  "session.created",
  "session.ended",
  "webhook.test",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WebhookEventSchema = t.Union([
  t.Literal("score.submitted"),
  t.Literal("score.hidden"),
  t.Literal("score.rejected"),
  t.Literal("session.created"),
  t.Literal("session.ended"),
  t.Literal("webhook.test"),
]);
export type WebhookEventSchema = UnwrapSchema<typeof WebhookEventSchema>;

export const WebhookConfigView = t.Object({
  id: t.String(),
  organizationId: t.String(),
  platformId: t.String(),
  url: t.String(),
  description: t.Union([t.String(), t.Null()]),
  secretLast4: t.String(),
  events: t.Array(t.String()),
  enabled: t.Boolean(),
  lastDeliveryAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  lastFailureAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type WebhookConfigView = UnwrapSchema<typeof WebhookConfigView>;

export const WebhookConfigSingle = t.Object({ webhook: WebhookConfigView });
export type WebhookConfigSingle = UnwrapSchema<typeof WebhookConfigSingle>;

export const OrgWebhookView = t.Object({
  ...WebhookConfigView.properties,
  platformName: t.Union([t.String(), t.Null()]),
  platformSlug: t.Union([t.String(), t.Null()]),
});
export type OrgWebhookView = UnwrapSchema<typeof OrgWebhookView>;

export const OrgWebhookList = t.Object({ webhooks: t.Array(OrgWebhookView) });
export type OrgWebhookList = UnwrapSchema<typeof OrgWebhookList>;

export const WebhookDeliveryView = t.Object({
  id: t.String(),
  eventId: t.String(),
  eventType: t.String(),
  attempt: t.Number(),
  status: t.Union([
    t.Literal("delivered"),
    t.Literal("failed"),
    t.Literal("retrying"),
  ]),
  statusCode: t.Union([t.Number(), t.Null()]),
  responseBody: t.Union([t.String(), t.Null()]),
  error: t.Union([t.String(), t.Null()]),
  durationMs: t.Union([t.Number(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});
export type WebhookDeliveryView = UnwrapSchema<typeof WebhookDeliveryView>;

export const WebhookDeliveryList = t.Object({
  deliveries: t.Array(WebhookDeliveryView),
});
export type WebhookDeliveryList = UnwrapSchema<typeof WebhookDeliveryList>;

export const WebhookConfigList = t.Object({ webhooks: t.Array(WebhookConfigView) });
export type WebhookConfigList = UnwrapSchema<typeof WebhookConfigList>;

export const CreatedWebhook = t.Object({
  webhook: WebhookConfigView,
  secret: t.String(),
});
export type CreatedWebhook = UnwrapSchema<typeof CreatedWebhook>;

export const CreateWebhookBody = t.Object({
  url: t.String({ format: "uri", maxLength: 2000 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  events: t.Array(WebhookEventSchema, { minItems: 1, maxItems: 20 }),
  enabled: t.Optional(t.Boolean()),
});
export type CreateWebhookBody = UnwrapSchema<typeof CreateWebhookBody>;

export const UpdateWebhookBody = t.Object(
  {
    url: t.Optional(t.String({ format: "uri", maxLength: 2000 })),
    description: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
    events: t.Optional(t.Array(WebhookEventSchema, { minItems: 1, maxItems: 20 })),
    enabled: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateWebhookBody = UnwrapSchema<typeof UpdateWebhookBody>;

export const OrganizationWebhookIdParams = t.Object({
  organizationId: t.String(),
  webhookId: t.String(),
});
export type OrganizationWebhookIdParams = UnwrapSchema<typeof OrganizationWebhookIdParams>;

export const WebhookParams = t.Object({
  organizationId: t.String(),
  platformId: t.String(),
});
export type WebhookParams = UnwrapSchema<typeof WebhookParams>;

export const WebhookIdParams = t.Object({
  organizationId: t.String(),
  platformId: t.String(),
  webhookId: t.String(),
});
export type WebhookIdParams = UnwrapSchema<typeof WebhookIdParams>;
