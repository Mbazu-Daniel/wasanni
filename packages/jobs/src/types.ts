import type { EmailPurpose } from "@wasanni/kit";

export type WebhookDeliveryJob = {
  webhookId: string;
  organizationId: string;
  platformId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
};

export type EmailJob = {
  to: string;
  subject: string;
  url: string;
  purpose: EmailPurpose;
};

export type ScorePackJob = {
  organizationId?: string;
  limit?: number;
};

export type ScoreRecheckJob = {
  organizationId: string;
  configId: string;
};
