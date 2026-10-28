import { BadRequestError } from "@wasanni/kit";
import modelsApi from "./models-api.json";

export type AgentCatalogModel = {
  readonly id: string;
  readonly label: string;
  readonly priceInputMicrosPerMillion: number;
  readonly priceOutputMicrosPerMillion: number;
  readonly priceCacheReadMicrosPerMillion: number | null;
};

export type AgentRunUsage = {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly cacheReadTokens: number;
};

export type AgentCatalogProvider = {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly models: AgentCatalogModel[];
};

type ModelsApiCost = {
  input?: number;
  output?: number;
  cache_read?: number;
};

type ModelsApiProvider = {
  id: string;
  name: string;
  api?: string;
  npm?: string;
  models?: Record<string, { name?: string; cost?: ModelsApiCost }>;
};

const microsPerMillion = (usd: number | undefined): number =>
  usd === undefined ? 0 : Math.round(usd * 1_000_000);

const SEPARATORS = /[./:_\s-]+/g;
const DATED = /@20\d{6}$|-20\d{2}-\d{2}-\d{2}|-20\d{6}$/;

const catalogKey = (model: string): string =>
  model.toLowerCase().replace(SEPARATORS, "-");

const undated = (model: string): string => model.replace(DATED, "");

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  deepseek: "https://api.deepseek.com/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  cerebras: "https://api.cerebras.ai/v1",
  togetherai: "https://api.together.xyz/v1",
  together: "https://api.together.xyz/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  ollama: "http://localhost:11434/v1",
};

const toProvider = (provider: ModelsApiProvider): AgentCatalogProvider | null => {
  if (provider.npm === "@ai-sdk/anthropic") return null;
  const baseUrl = provider.api ?? DEFAULT_BASE_URLS[provider.id] ?? "";
  if (baseUrl === "") return null;
  return {
    id: provider.id,
    name: provider.name,
    baseUrl,
    models: Object.entries(provider.models ?? {}).map(([id, model]) => ({
      id,
      label: model.name ?? id,
      priceInputMicrosPerMillion: microsPerMillion(model.cost?.input),
      priceOutputMicrosPerMillion: microsPerMillion(model.cost?.output),
      priceCacheReadMicrosPerMillion:
        model.cost?.cache_read === undefined
          ? null
          : microsPerMillion(model.cost.cache_read),
    })),
  };
};

const CUSTOM_PROVIDER: AgentCatalogProvider = {
  id: "custom",
  name: "Custom OpenAI-compatible endpoint",
  baseUrl: "",
  models: [],
};

const AGENT_CATALOG = [
  ...Object.values(modelsApi as Record<string, ModelsApiProvider>)
    .map(toProvider)
    .filter((provider): provider is AgentCatalogProvider => provider !== null),
  CUSTOM_PROVIDER,
];

export async function loadAgentCatalog(): Promise<AgentCatalogProvider[]> {
  return AGENT_CATALOG;
}

const MODELS_BY_SPEC = new Map(
  AGENT_CATALOG.map((provider) => [
    provider.id,
    new Map(
      provider.models.map((model) => [catalogKey(model.id), model] as const),
    ),
  ]),
);

const lookupKeys = (model: string): string[] => {
  const asKey = catalogKey(model);
  const slash = model.indexOf("/");

  if (slash === -1) return [...new Set([asKey, undated(asKey)])];

  const withoutVendor = catalogKey(model.slice(slash + 1));

  return [
    ...new Set([asKey, undated(asKey), withoutVendor, undated(withoutVendor)]),
  ];
};

const priceTotal = (model: AgentCatalogModel): number =>
  model.priceInputMicrosPerMillion + model.priceOutputMicrosPerMillion;

const MARKET_BY_MODEL = new Map<string, AgentCatalogModel[]>();

for (const provider of AGENT_CATALOG) {
  for (const model of provider.models) {
    if (priceTotal(model) === 0) continue;

    for (const key of lookupKeys(model.id)) {
      const listed = MARKET_BY_MODEL.get(key);

      if (listed === undefined) MARKET_BY_MODEL.set(key, [model]);
      else listed.push(model);
    }
  }
}

const marketRate = (model: string): AgentCatalogModel | undefined => {
  for (const key of lookupKeys(model)) {
    const listed = MARKET_BY_MODEL.get(key);
    if (listed === undefined || listed.length === 0) continue;

    const frequency = new Map<
      string,
      { count: number; listing: AgentCatalogModel }
    >();

    for (const entry of listed) {
      const rate = `${entry.priceInputMicrosPerMillion}/${entry.priceOutputMicrosPerMillion}`;
      const seen = frequency.get(rate);

      if (seen === undefined) {
        frequency.set(rate, { count: 1, listing: entry });
      } else {
        seen.count += 1;
        if (seen.listing.priceCacheReadMicrosPerMillion === null) {
          seen.listing = entry;
        }
      }
    }

    return [...frequency.values()].sort(
      (a, b) =>
        b.count - a.count ||
        priceTotal(a.listing) - priceTotal(b.listing) ||
        a.listing.id.localeCompare(b.listing.id),
    )[0]?.listing;
  }

  return undefined;
};

export const catalogModel = (
  spec: string,
  model: string,
): AgentCatalogModel | undefined => {
  const models = MODELS_BY_SPEC.get(spec);

  if (models !== undefined) {
    for (const key of lookupKeys(model)) {
      const entry = models.get(key);
      if (entry !== undefined && priceTotal(entry) > 0) return entry;
    }
  }

  return marketRate(model);
};

export const estimateCostMicros = (
  model: AgentCatalogModel | undefined,
  usage: AgentRunUsage,
): number => {
  if (model === undefined) return 0;

  const cached = Math.min(Math.max(usage.cacheReadTokens, 0), usage.promptTokens);
  const cacheRead =
    model.priceCacheReadMicrosPerMillion ?? model.priceInputMicrosPerMillion;

  return Math.round(
    ((usage.promptTokens - cached) * model.priceInputMicrosPerMillion +
      cached * cacheRead +
      usage.completionTokens * model.priceOutputMicrosPerMillion) /
      1_000_000,
  );
};

export async function providerFromCatalog(
  id: string,
): Promise<AgentCatalogProvider> {
  const provider = AGENT_CATALOG.find((entry) => entry.id === id);
  if (provider === undefined) throw new BadRequestError(`unknown provider ${id}`);
  return provider;
}
