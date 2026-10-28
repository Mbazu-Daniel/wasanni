import { Agent } from "@mastra/core/agent";
import { MastraServer, type HonoBindings, type HonoVariables } from "@mastra/hono";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Hono } from "hono";
import { readEnv } from "@wasanni/kit";
import { DEFAULT_SYSTEM_PROMPT } from "./modules/agent/constants.ts";
import { createAgentRuntime } from "./modules/agent/mastra.ts";

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

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();

await new MastraServer({ app, mastra: runtime.mastra }).init();

const port = Number(process.env.MASTRA_STUDIO_PORT ?? 4111);

Bun.serve({ port, hostname: "127.0.0.1", fetch: app.fetch });

console.log(
  `mastra studio server on http://127.0.0.1:${port} — point https://studio.mastra.io at this address`,
);
