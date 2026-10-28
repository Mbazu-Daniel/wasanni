import type { ScoreVerificationMode } from "@wasanni/contracts";
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

  if (mode === "hmac" || mode === "callback" || mode === "both") return mode;

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

  return {
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

export const readGameConfig = (config: Record<string, unknown>): GameConfig => ({
  verificationMode: readVerificationMode(config),
  sessionDurationSeconds: readSessionDuration(config),
  rules: readRules(config),
  callback: readCallback(config),
});
