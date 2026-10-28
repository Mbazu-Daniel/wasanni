import {
  SCORE_FLAG_RULES,
  SCORE_GAME_TYPES,
  type ScoreFlagRule,
  type ScoreVerificationMode,
} from "@wasanni/contracts";
import {
  DEFAULT_SESSION_DURATION_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
  MIN_SESSION_DURATION_SECONDS,
} from "./constants.ts";
import type { ScoreRules } from "./types.ts";

export type CallbackConfig = {
  url: string;
  secret: string;
  timeoutMs: number | null;
};

export type GameConfig = {
  verificationMode: ScoreVerificationMode;
  sessionDurationSeconds: number;
  rules: ScoreRules;
  callback: CallbackConfig | null;
};

const blockOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const readVerificationMode = (config: Record<string, unknown>): ScoreVerificationMode => {
  const mode = blockOf(config.scoreVerification)?.mode;

  if (mode === "callback") return mode;

  return "none";
};

const readSessionDuration = (config: Record<string, unknown>): number => {
  const value = config.sessionDurationSeconds;

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_SESSION_DURATION_SECONDS;
  }

  if (value < MIN_SESSION_DURATION_SECONDS || value > MAX_SESSION_DURATION_SECONDS) {
    return DEFAULT_SESSION_DURATION_SECONDS;
  }

  return value;
};

const readRules = (config: Record<string, unknown>): ScoreRules => {
  const rules = blockOf(config.rules);
  const gameType = SCORE_GAME_TYPES.find((value) => value === rules?.gameType);
  const checks = Array.isArray(rules?.checks)
    ? rules.checks.filter((value): value is ScoreFlagRule =>
        typeof value === "string" && SCORE_FLAG_RULES.includes(value as ScoreFlagRule),
      )
    : undefined;

  return {
    ...(gameType === undefined ? {} : { gameType }),
    ...(checks === undefined ? {} : { checks }),
    ...(typeof rules?.maxScore === "number" ? { maxScore: rules.maxScore } : {}),
    ...(typeof rules?.maxScorePerSecond === "number"
      ? { maxScorePerSecond: rules.maxScorePerSecond }
      : {}),
  };
};

const readCallback = (config: Record<string, unknown>): CallbackConfig | null => {
  const callback = blockOf(blockOf(config.scoreVerification)?.callback);

  if (callback === null) return null;

  const { url, secret, timeoutMs } = callback;

  if (typeof url !== "string" || typeof secret !== "string") return null;

  return { url, secret, timeoutMs: typeof timeoutMs === "number" ? timeoutMs : null };
};

export const callbackSecretOf = (config: Record<string, unknown>): string | null =>
  readCallback(config)?.secret ?? null;

export const callbackEndpointOf = (config: Record<string, unknown>): { url: string; timeoutMs: number | null } | null => {
  const callback = blockOf(blockOf(config.scoreVerification)?.callback);
  if (callback === null || typeof callback.url !== "string") return null;
  return { url: callback.url, timeoutMs: typeof callback.timeoutMs === "number" ? callback.timeoutMs : null };
};

export const withoutCallbackSecret = (config: Record<string, unknown>): Record<string, unknown> => {
  const verification = blockOf(config.scoreVerification);
  const callback = blockOf(verification?.callback);
  if (callback === null || verification === null || !Object.hasOwn(callback, "secret")) return config;
  return {
    ...config,
    scoreVerification: {
      ...verification,
      callback: Object.fromEntries(Object.entries(callback).filter(([key]) => key !== "secret")),
    },
  };
};

export const readGameConfig = (config: Record<string, unknown>): GameConfig => ({
  verificationMode: readVerificationMode(config),
  sessionDurationSeconds: readSessionDuration(config),
  rules: readRules(config),
  callback: readCallback(config),
});
