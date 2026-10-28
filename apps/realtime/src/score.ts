import type { ScoreView, SubmitScoreBody } from "@wasanni/contracts";
import { SCORE_FORWARD_TIMEOUT_MS } from "./constants.ts";
import type { ScoreForwarder, ScoreForwarderDeps, ScoreForwardResult } from "./types.ts";

const readFailure = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    const message = body.error?.message;

    return typeof message === "string" && message !== ""
      ? message
      : "the score was not recorded";
  } catch {
    return "the score was not recorded";
  }
};

export function createScoreForwarder(deps: ScoreForwarderDeps): ScoreForwarder {
  const base = deps.apiUrl.replace(/\/+$/, "");
  const send = deps.fetch ?? fetch;

  return {
    async forward({ sessionId, token, score, endSession }): Promise<ScoreForwardResult> {
      const body: SubmitScoreBody = {
        score,
        ...(endSession ? { endSession } : {}),
      };
      const url = `${base}/api/v1/play/sessions/${encodeURIComponent(sessionId)}/score`;

      try {
        const response = await send(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(SCORE_FORWARD_TIMEOUT_MS),
        });

        if (!response.ok) {
          return {
            ok: false,
            message: await readFailure(response),
          };
        }

        const payload = (await response.json()) as { score: ScoreView };

        return { ok: true, score: payload.score };
      } catch (error) {
        deps.logger.warn("score forward failed", { err: error, sessionId });

        return { ok: false, message: "the score could not be recorded" };
      }
    },
  };
}
