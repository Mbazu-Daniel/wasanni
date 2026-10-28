import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readConfig } from "./config.ts";
import { createMcpServer } from "./server.ts";
import { tools } from "./tools.ts";

const config = readConfig(process.env);

await createMcpServer(config).connect(new StdioServerTransport());

process.stderr.write(
  `wasanni mcp serving ${String(tools.length)} tools for ${config.baseUrl}\n`,
);
