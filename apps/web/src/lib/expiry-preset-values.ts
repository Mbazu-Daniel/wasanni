import { NEVER_EXPIRY, type ExpiryPreset } from "./expiry-presets.ts";

export const expiryPresetValue = (preset: ExpiryPreset): string =>
  preset.seconds === null ? NEVER_EXPIRY : String(preset.seconds);

export const secondsForPresetValue = (value: string): number | null =>
  value === NEVER_EXPIRY ? null : Number(value);
