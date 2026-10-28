import type { Logger } from "@wasanni/kit";
import {
  callbackEndpointOf,
  callbackSecretOf,
  hmacSign,
  assertSafeOutboundUrl,
} from "@wasanni/kit";
import type {
  ScoreVerificationInput,
  ScoreVerificationVerdict,
} from "./types.ts";

export function createScoreVerifier(
  logger: Logger,
  allowPrivateOutbound: boolean,
) {
  const verifyCallback = async (
    input: ScoreVerificationInput,
    callback: { url: string; timeoutMs: number | null },
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

    const callbackSecret = input.callbackSecret ?? callbackSecretOf(input.config);

    if (callbackSecret === undefined || callbackSecret === null) {
      return { kind: "failed", code: "callback_config_missing", reason: "the callback secret is missing" };
    }

    let callbackUrl: URL;

    try {
      callbackUrl = await assertSafeOutboundUrl(callback.url, allowPrivateOutbound);
    } catch {
      return { kind: "failed", code: "callback_config_invalid", reason: "the verifier url is not allowed" };
    }

    const signature = hmacSign(callbackSecret, body, timestamp);

    let response: Response;

    try {
      response = await fetch(callbackUrl, {
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
    async verify(input: ScoreVerificationInput): Promise<ScoreVerificationVerdict> {
      if (input.mode === "none") return { kind: "passed", flags: [] };

      const callback = callbackEndpointOf(input.config);

      if (callback === null) {
        return {
          kind: "failed",
          code: "callback_config_missing",
          reason: "the callback mode is configured without a callback",
        };
      }

      const result = await verifyCallback(input, callback);

      if (result.kind === "failed") return result;

      if (result.kind === "unavailable") return result;

      return result;
    },
  };
}
