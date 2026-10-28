import { createHmac, timingSafeEqual } from "node:crypto";
import type { Env, Logger } from "@wasanni/kit";
import { decryptSecret, encryptSecret, hmacSign, randomBytesBase64Url } from "@wasanni/kit";
import type { ScoreVerificationMode } from "@wasanni/contracts";

export type ScoreVerificationInput = {
  sessionId: string;
  organizationId: string;
  externalUserId: string;
  score: number;
  mode: ScoreVerificationMode;
  submittedAt: Date;
  signingKeyCiphertext: string | null;
  signature: string | null;
  config: Record<string, unknown>;
};

export type ScoreVerificationVerdict =
  | { kind: "passed"; flags: string[] }
  | { kind: "unavailable"; flags: string[]; reason: string }
  | { kind: "failed"; code: string; reason: string };

export const SCORE_SIGNATURE_PAYLOAD = (sessionId: string, score: number): string =>
  `${sessionId}|${score}`;

const sameSignature = (expected: string, given: string): boolean => {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(given, "utf8");

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
};

type CallbackConfig = {
  url: string;
  secret: string;
  timeoutMs?: number;
};

const readCallbackConfig = (config: Record<string, unknown>): CallbackConfig | null => {
  const block = config.scoreVerification;

  if (typeof block !== "object" || block === null) return null;

  const callback = (block as Record<string, unknown>).callback;

  if (typeof callback !== "object" || callback === null) return null;

  const { url, secret, timeoutMs } = callback as Record<string, unknown>;

  if (typeof url !== "string" || typeof secret !== "string") return null;

  return {
    url,
    secret,
    ...(typeof timeoutMs === "number" ? { timeoutMs } : {}),
  };
};

export function createScoreVerifier(env: Env, logger: Logger) {
  const createSigningKey = (): { plaintext: string; ciphertext: string } => {
    const plaintext = randomBytesBase64Url(32);

    return {
      plaintext,
      ciphertext: encryptSecret(plaintext, env.WEBHOOK_SECRET_ENCRYPTION_KEY),
    };
  };

  const verifyHmac = (
    input: ScoreVerificationInput,
  ): ScoreVerificationVerdict | null => {
    if (input.signingKeyCiphertext === null) {
      return { kind: "failed", code: "signature_key_missing", reason: "the session has no signing key" };
    }

    if (input.signature === null) {
      return { kind: "failed", code: "signature_missing", reason: "a signature is required" };
    }

    let key: string;

    try {
      key = decryptSecret(input.signingKeyCiphertext, env.WEBHOOK_SECRET_ENCRYPTION_KEY);
    } catch {
      return {
        kind: "failed",
        code: "signature_key_unreadable",
        reason: "the session signing key could not be read",
      };
    }

    const expected = createHmac("sha256", key)
      .update(SCORE_SIGNATURE_PAYLOAD(input.sessionId, input.score))
      .digest("base64url");

    if (!sameSignature(expected, input.signature)) {
      return { kind: "failed", code: "signature_mismatch", reason: "the signature does not match" };
    }

    return null;
  };

  const verifyCallback = async (
    input: ScoreVerificationInput,
    callback: CallbackConfig,
  ): Promise<ScoreVerificationVerdict> => {
    const body = JSON.stringify({
      event: "score.verify",
      sessionId: input.sessionId,
      organizationId: input.organizationId,
      externalUserId: input.externalUserId,
      score: input.score,
      submittedAt: input.submittedAt.toISOString(),
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = hmacSign(callback.secret, body, timestamp);

    let response: Response;

    try {
      response = await fetch(callback.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Wasanni-Verifier/1",
          "x-wasanni-verify-timestamp": String(timestamp),
          "x-wasanni-verify-signature": `t=${timestamp},v1=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(callback.timeoutMs ?? 3_000),
      });
    } catch (error) {
      logger.warn("score_verifier.callback_unreachable", {
        sessionId: input.sessionId,
        err: error,
      });

      return {
        kind: "unavailable",
        flags: ["verification_unavailable"],
        reason: "the verifier did not respond",
      };
    }

    if (!response.ok) {
      return {
        kind: "unavailable",
        flags: ["verification_unavailable"],
        reason: `the verifier answered ${response.status}`,
      };
    }

    let parsed: { valid?: boolean; reason?: string };

    try {
      parsed = (await response.json()) as { valid?: boolean; reason?: string };
    } catch {
      return {
        kind: "unavailable",
        flags: ["verification_unavailable"],
        reason: "the verifier answered with something that is not json",
      };
    }

    if (parsed.valid === true) {
      return { kind: "passed", flags: ["callback_verified"] };
    }

    if (parsed.valid === false) {
      return {
        kind: "failed",
        code: "callback_rejected",
        reason: parsed.reason ?? "the verifier rejected the score",
      };
    }

    return {
      kind: "unavailable",
      flags: ["verification_unavailable"],
      reason: "the verifier answered with an unknown body",
    };
  };

  return {
    createSigningKey,

    async verify(input: ScoreVerificationInput): Promise<ScoreVerificationVerdict> {
      if (input.mode === "none") return { kind: "passed", flags: [] };

      const flags: string[] = [];

      if (input.mode === "hmac" || input.mode === "both") {
        const failure = verifyHmac(input);

        if (failure !== null) return failure;

        flags.push("hmac_verified");
      }

      if (input.mode === "callback" || input.mode === "both") {
        const callback = readCallbackConfig(input.config);

        if (callback === null) {
          return {
            kind: "failed",
            code: "callback_config_missing",
            reason: "the callback mode is configured without a callback",
          };
        }

        const result = await verifyCallback(input, callback);

        if (result.kind === "failed") return result;

        if (result.kind === "unavailable") {
          return { kind: "unavailable", flags: [...flags, ...result.flags], reason: result.reason };
        }

        flags.push(...result.flags);
      }

      return { kind: "passed", flags };
    },
  };
}

export type ScoreVerifier = ReturnType<typeof createScoreVerifier>;
