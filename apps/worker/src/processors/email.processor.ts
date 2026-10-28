import { InternalServerError, type Env, type Logger } from "@wasanni/kit";
import type { EmailJob } from "@wasanni/jobs";

const ZEPTOMAIL_ENDPOINT = "https://api.zeptomail.com/v1.1/email";
const ZEPTOMAIL_TIMEOUT_MS = 15_000;

export function normalizeZeptoToken(raw: string): string {
  return raw.startsWith("Zoho-enczapikey") ? raw : `Zoho-enczapikey ${raw}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmailHtml(job: EmailJob): string {
  const label =
    job.purpose === "verify"
      ? "Confirm your email"
      : job.purpose === "reset"
        ? "Reset your password"
        : job.purpose === "changeEmail"
          ? "Confirm your new email"
          : "Open invitation";

  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px">',
    '<h2 style="margin:0 0 12px;font-size:22px;color:#16201A">Wasanni</h2>',
    `<p style="margin:0 0 24px;font-size:15px;color:#475549">${escapeHtml(job.subject)}</p>`,
    `<a href="${escapeHtml(job.url)}" style="display:inline-block;background:#14452F;color:#F4F6F1;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${escapeHtml(label)}</a>`,
    '<p style="margin:24px 0 0;font-size:13px;color:#475549">If the button does not work, paste this link into your browser:</p>',
    `<p style="margin:6px 0 0;font-size:13px;word-break:break-all;color:#14452F">${escapeHtml(job.url)}</p>`,
    "</div>",
  ].join("");
}

export function buildZeptoPayload(job: EmailJob, env: Env): Record<string, unknown> {
  return {
    from: { address: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME },
    to: [
      {
        email_address: {
          address: job.to,
          name: job.to.split("@")[0] ?? job.to,
        },
      },
    ],
    subject: job.subject,
    htmlbody: renderEmailHtml(job),
    textbody: `${job.subject}\n\n${job.url}`,
  };
}

export function createEmailProcessor(env: Env, logger: Logger) {
  return async function send(job: EmailJob): Promise<unknown> {
    const token = env.ZEPTOMAIL_API_KEY;

    if (token === undefined) {
      throw new InternalServerError("ZEPTOMAIL_API_KEY is not configured");
    }

    const response = await fetch(ZEPTOMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: normalizeZeptoToken(token),
      },
      body: JSON.stringify(buildZeptoPayload(job, env)),
      signal: AbortSignal.timeout(ZEPTOMAIL_TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.warn("email.rejected", { status: response.status, purpose: job.purpose });
      throw new InternalServerError(`zeptomail ${response.status}: ${text.slice(0, 300)}`);
    }

    return { ok: true };
  };
}
