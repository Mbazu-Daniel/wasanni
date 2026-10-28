export type ProviderErrorCode =
  | "rate_limited"
  | "provider_refused_request"
  | "provider_key_rejected"
  | "provider_unreachable"
  | "provider_timed_out"
  | "provider_unknown";

export type ProviderFailure = {
  readonly code: ProviderErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly statusCode: number | null;
  readonly providerRequestId: string | null;
};

type ProviderErrorShape = {
  readonly message: string;
  readonly statusCode: number | null;
  readonly responseBody: string | null;
  readonly retryAfterSeconds: number | null;
  readonly providerRequestId: string | null;
};

const readString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const readStatus = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) ? value : null;

const headerOf = (headers: unknown, name: string): string | null => {
  if (typeof headers !== "object" || headers === null) return null;

  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === name,
  );

  return entry === undefined ? null : readString(entry[1]);
};

const messageFrom = (body: string | null): string | null => {
  if (body === null) return null;

  try {
    const parsed = JSON.parse(body) as unknown;

    if (typeof parsed !== "object" || parsed === null) return null;

    const error = (parsed as { error?: unknown }).error;

    if (typeof error === "object" && error !== null) {
      return readString((error as { message?: unknown }).message);
    }

    return null;
  } catch {
    return null;
  }
};

const shapeOf = (caught: unknown, seen: unknown[] = []): ProviderErrorShape | null => {
  if (typeof caught !== "object" || caught === null || seen.includes(caught)) return null;

  seen.push(caught);

  const record = caught as Record<string, unknown>;
  const statusCode = readStatus(record["statusCode"]) ?? readStatus(record["status"]);
  const responseBody = readString(record["responseBody"]);
  const headers = record["responseHeaders"];

  const shape: ProviderErrorShape = {
    message: readString(record["message"]) ?? "",
    statusCode,
    responseBody,
    retryAfterSeconds: readStatus(headerOf(headers, "retry-after")),
    providerRequestId: headerOf(headers, "x-request-id") ?? headerOf(headers, "request-id"),
  };

  if (shape.statusCode !== null || shape.responseBody !== null) return shape;

  return shapeOf(record["cause"], seen) ?? (shape.message !== "" ? shape : null);
};

const TPM_LIMIT = /Limit (\d+), Requested (\d+)/;

const TIMEOUT = /timed out|timeout|abort|econnreset|socket hang up/i;

const UNREACHABLE = /fetch failed|failed to fetch|econnrefused|enotfound|eai_again|network/i;

export const classifyProviderError = (caught: unknown): ProviderFailure => {
  const shape = shapeOf(caught);
  const raw = shape?.message ?? "";
  const detail = shape?.responseBody === null ? null : messageFrom(shape?.responseBody ?? null);
  const stated = detail ?? (raw !== "" ? raw : "the provider gave no reason");

  if (shape === null) {
    return {
      code: "provider_unreachable",
      message: "the provider could not be reached",
      retryable: true,
      statusCode: null,
      providerRequestId: null,
    };
  }

  const withStatus = (code: ProviderErrorCode, message: string, retryable: boolean): ProviderFailure => ({
    code,
    message,
    retryable,
    statusCode: shape.statusCode,
    providerRequestId: shape.providerRequestId,
  });

  if (shape.statusCode === 413 || shape.statusCode === 429) {
    const tpm = TPM_LIMIT.exec(stated);

    return withStatus(
      "rate_limited",
      tpm === null
        ? `the provider refused the request as too large or too frequent: ${stated}`
        : `this provider allows ${tpm[1]} tokens per minute and the request needed ${tpm[2]}. Start a new chat, send a smaller file, or pick a provider with a larger budget.`,
      shape.statusCode === 429,
    );
  }

  if (shape.statusCode === 401 || shape.statusCode === 403) {
    return withStatus("provider_key_rejected", "the provider rejected this api key", false);
  }

  if (shape.statusCode === 408 || shape.statusCode === 504) {
    return withStatus("provider_timed_out", "the provider took too long to answer", true);
  }

  if (shape.statusCode === 400) {
    return withStatus("provider_refused_request", `the provider refused this request: ${stated}`, false);
  }

  if (shape.statusCode === null && TIMEOUT.test(stated)) {
    return withStatus("provider_timed_out", "the run stopped before the provider answered", true);
  }

  if (shape.statusCode === null && UNREACHABLE.test(stated)) {
    return withStatus("provider_unreachable", "the provider could not be reached", true);
  }

  if (shape.statusCode !== null && shape.statusCode >= 500) {
    return withStatus("provider_unreachable", `the provider answered ${shape.statusCode}`, true);
  }

  return withStatus("provider_unknown", stated, false);
};
