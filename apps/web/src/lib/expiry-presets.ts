export type ExpiryPreset = { label: string; seconds: number | null };

const DAY = 86_400;

export const NEVER_EXPIRY = "never";

export const EXPIRY_PRESETS: ExpiryPreset[] = [
  { label: "1 day", seconds: DAY },
  { label: "7 days", seconds: 7 * DAY },
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "365 days", seconds: 365 * DAY },
  { label: "Never", seconds: null },
];

export const DEFAULT_EXPIRY_VALUE = String(90 * DAY);
