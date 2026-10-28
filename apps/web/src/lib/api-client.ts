import axios, { type AxiosRequestConfig } from "axios";
import { apiBaseURL } from "./auth-client";

const baseURL = apiBaseURL;

type ApiErrorPayload = {
  code?: string;
  message?: string;
  requestId?: string;
};

function readApiError(value: unknown): ApiErrorPayload | undefined {
  if (typeof value !== "object" || value === null || !("error" in value)) return undefined;

  const error = value.error;
  if (typeof error !== "object" || error === null) return undefined;

  return {
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    message: "message" in error && typeof error.message === "string" ? error.message : undefined,
    requestId:
      "requestId" in error && typeof error.requestId === "string" ? error.requestId : undefined,
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "content-type": "application/json" },
});

export async function apiFetch<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await api.request<T>({ ...config, url: path });
    if (response.status === 204) return undefined as T;
    return response.data;
  } catch (cause) {
    if (!axios.isAxiosError(cause)) throw cause;

    const error = readApiError(cause.response?.data);
    throw new ApiError(
      cause.response?.status ?? 0,
      error?.code ?? "network_error",
      error?.message ?? cause.message,
      error?.requestId,
    );
  }
}

export { api };
