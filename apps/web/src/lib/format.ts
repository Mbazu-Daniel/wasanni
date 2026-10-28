export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatUsd(micros: number): string {
  const dollars = micros / 1_000_000;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars >= 1 || dollars === 0 ? 2 : 4,
    maximumFractionDigits: dollars >= 1 ? 2 : 6,
  }).format(dollars);
}

export const usdPerMillion = (micros: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(micros / 1_000_000);

export function formatTokens(count: number): string {
  if (count < 1000) return `${count} tok`;

  return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k tok`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  return `${(ms / 1000).toFixed(1)}s`;
}
