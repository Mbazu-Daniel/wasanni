import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { McpConfig } from "./config.ts";
import { tools, type ToolResult } from "./tools.ts";

const INSTRUCTIONS = [
  "Wasanni is the scoring and competition layer for web games.",
  "Every tool calls the platform api as the organization of the api key configured on this server.",
  "Before writing integration code, call integration_guide with no arguments and read the quickstart.",
  "When you need a request body or a response field, call api_docs with that path instead of guessing it.",
].join(" ");

const asContent = (result: ToolResult) => ({
  content: [{ type: "text" as const, text: result.text }],
  ...(result.ok ? {} : { isError: true }),
});

export const createMcpServer = (config: McpConfig): Server => {
  const server = new Server(
    { name: "wasanni", version: "0.0.0" },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
      annotations: { readOnlyHint: tool.readOnly, destructiveHint: !tool.readOnly },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((candidate) => candidate.name === request.params.name);

    if (tool === undefined) {
      return asContent({
        ok: false,
        text: `no wasanni tool is named ${request.params.name}`,
      });
    }

    try {
      return asContent(await tool.run(config, request.params.arguments));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return asContent({ ok: false, text: `${tool.name} did not run: ${message}` });
    }
  });

  return server;
};
