import type { McpConfig } from "./config.ts";

export type ApiRequest = {
  readonly method: "GET" | "POST" | "DELETE";
  readonly path: string;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
};

type ErrorBody = {
  error?: { code?: unknown; message?: unknown; requestId?: unknown };
};

const describeFailure = (status: number, text: string): string => {
  let body: ErrorBody | null = null;

  try {
    body = JSON.parse(text) as ErrorBody;
  } catch {
    body = null;
  }

  const error = body?.error;

  if (error !== undefined && typeof error.message === "string") {
    const code = typeof error.code === "string" ? error.code : "error";
    const requestId = typeof error.requestId === "string" ? ` (request ${error.requestId})` : "";

    return `${status} ${code}: ${error.message}${requestId}`;
  }

  return `${status}: ${text.slice(0, 400)}`;
};

export const callApi = async (
  config: McpConfig,
  request: ApiRequest,
): Promise<{ ok: true; text: string } | { ok: false; text: string }> => {
  const url = new URL(request.path, `${config.baseUrl}/`);

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: request.method,
    headers: {
      accept: "application/json",
      "x-api-key": config.apiKey,
      ...(request.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
  });

  const text = await response.text();

  if (!response.ok) return { ok: false, text: describeFailure(response.status, text) };

  return { ok: true, text: text === "" ? "{}" : text };
};
