import { Agent } from "@mastra/core/agent";
import { MastraServer } from "@mastra/elysia";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { readEnv } from "@wasanni/kit";
import { DEFAULT_SYSTEM_PROMPT } from "./modules/agent/constants.ts";
import { createAgentRuntime } from "./modules/agent/mastra.ts";
import {
  fetchStudioAsset,
  fetchStudioPage,
  findStudioAssets,
  isStudioAssetPath,
  loadStudioPage,
  studioHtmlConfig,
} from "./modules/agent/studio.ts";

const env = readEnv();
const runtime = createAgentRuntime(env.DATABASE_URL, env.AGENT_OTEL_ENDPOINT);

if (env.AGENT_BASE_URL !== undefined && env.AGENT_MODEL !== undefined) {
  runtime.mastra.addAgent(
    new Agent({
      id: "wasanni-builder",
      name: "wasanni-builder",
      instructions: DEFAULT_SYSTEM_PROMPT,
      memory: runtime.memory,
      model: createOpenAICompatible({
        name: "wasanni-platform",
        apiKey: env.AGENT_API_KEY ?? "",
        baseURL: env.AGENT_BASE_URL,
      }).chatModel(env.AGENT_MODEL),
      mastra: runtime.mastra,
    }),
  );
}

const app = new Elysia().use(cors({ origin: ["https://studio.mastra.io"] }));

await new MastraServer({ app, mastra: runtime.mastra }).init();

const port = Number(process.env.MASTRA_STUDIO_PORT ?? 4111);
const hostname = "127.0.0.1";
const assets = findStudioAssets(import.meta.dir);
const createStudioFetch = assets === undefined
  ? undefined
  : (studioConfig: Record<string, string>) =>
      (request: Request) => {
        const pathname = new URL(request.url).pathname;
        if (isStudioAssetPath(pathname)) return fetchStudioAsset(request, assets);
        if (pathname.startsWith("/api")) return app.handle(request);
        return fetchStudioPage(request, loadStudioPage(assets, studioConfig));
      };

const fetchAll: (request: Request) => Response | Promise<Response> =
  createStudioFetch === undefined
    ? (request) => app.handle(request)
    : createStudioFetch(studioHtmlConfig(hostname, port));

Bun.serve({ port, hostname, fetch: fetchAll });

console.log(
  `mastra studio server on http://${hostname}:${port}: the studio UI and the API live here`,
);
