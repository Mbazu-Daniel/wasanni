import type { Logger } from "../logger/types.ts";
import type { EmailPayload } from "./types.ts";

export async function sendDevEmail(payload: EmailPayload, logger: Logger): Promise<void> {
  logger.debug("mail.dev", {
    to: payload.to,
    subject: payload.subject,
    purpose: payload.purpose,
    url: payload.url,
  });
}
