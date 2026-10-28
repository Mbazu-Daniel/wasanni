import { assertSafeOutboundUrl, BadRequestError } from "@wasanni/kit";
import { MAX_LISTED_MODELS, MODELS_TIMEOUT_MS } from "./constants.ts";
import { providerFromCatalog } from "./catalog.ts";

export type ProviderEndpoint = {
  readonly spec: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly allowPrivateOutbound: boolean;
  readonly maxRequestTokens?: number | null;
};

export async function resolveBaseUrl(
  specId: string,
  given: string | undefined,
  allowPrivateOutbound: boolean,
): Promise<string> {
  const spec = await providerFromCatalog(specId);
  const baseUrl = (given ?? spec.baseUrl).trim().replace(/\/+$/, "");

  if (baseUrl === "") {
    throw new BadRequestError(`${spec.name} needs a base url`);
  }

  return (
    await assertSafeOutboundUrl(baseUrl, allowPrivateOutbound)
  )
    .toString()
    .replace(/\/+$/, "");
}

export async function listModels(endpoint: ProviderEndpoint): Promise<string[]> {
  const baseUrl = (await assertSafeOutboundUrl(endpoint.baseUrl, endpoint.allowPrivateOutbound))
    .toString()
    .replace(/\/+$/, "");
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/models`, {
      headers: { authorization: `Bearer ${endpoint.apiKey}` },
      signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
    });
  } catch {
    throw new BadRequestError(`cannot reach ${endpoint.baseUrl}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new BadRequestError("that api key was rejected");
  }

  if (!response.ok) {
    throw new BadRequestError(`${endpoint.baseUrl} returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as { data?: unknown }).data
      : undefined;

  if (!Array.isArray(data)) {
    throw new BadRequestError(`${endpoint.baseUrl} does not list models`);
  }

  const models: string[] = [];

  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;

    const id = (entry as { id?: unknown }).id;

    if (typeof id !== "string" || id === "") continue;

    models.push(id);

    if (models.length >= MAX_LISTED_MODELS) break;
  }

  return models;
}
