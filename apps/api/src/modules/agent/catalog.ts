import { BadRequestError } from "@wasanni/kit";
import modelsApi from "./models-api.json";

export type AgentCatalogModel = {
  readonly id: string;
  readonly label: string;
};

export type AgentCatalogProvider = {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly models: AgentCatalogModel[];
};

type ModelsApiProvider = {
  id: string;
  name: string;
  api?: string;
  npm?: string;
  models?: Record<string, { name?: string }>;
};

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

export async function providerFromCatalog(
  id: string,
): Promise<AgentCatalogProvider> {
  const provider = AGENT_CATALOG.find((entry) => entry.id === id);
  if (provider === undefined) throw new BadRequestError(`unknown provider ${id}`);
  return provider;
}
