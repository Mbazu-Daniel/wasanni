import { EMAIL_PURPOSES } from "./constants.ts";

export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export type EmailPayload = {
  to: string;
  subject: string;
  url: string;
  purpose: EmailPurpose;
};

export type SendEmail = (payload: EmailPayload) => Promise<void>;
