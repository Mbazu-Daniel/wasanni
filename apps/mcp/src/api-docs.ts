import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { callApi } from "./api.ts";
import type { McpConfig } from "./config.ts";
import type { Tool, ToolResult } from "./tools.ts";

const MAX_DOCS_CHARS = 16_000;

const PLATFORM_CREDENTIAL = "(platform api key)";

const schema = Type.Object({
  path: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 120,
      description: "a route as the api writes it, for example /api/v1/sessions/{sessionId}",
    }),
  ),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pathsOf = (text: string): Record<string, unknown> | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !isRecord(parsed["paths"])) return null;

  return parsed["paths"];
};

const summaryOf = (operation: unknown): string => {
  if (!isRecord(operation)) return "";

  const summary = typeof operation["summary"] === "string" ? operation["summary"] : "";
  const description =
    typeof operation["description"] === "string"
      ? (operation["description"].split("\n")[0] ?? "")
      : "";

  return summary === "" ? description.slice(0, 120) : summary;
};

const platformKeyed = (item: unknown): boolean =>
  isRecord(item) &&
  Object.values(item).some((operation) => summaryOf(operation).includes(PLATFORM_CREDENTIAL));

const listed = (paths: Record<string, unknown>): string =>
  Object.entries(paths)
    .sort(([, left], [, right]) => Number(platformKeyed(right)) - Number(platformKeyed(left)))
    .flatMap(([route, item]) =>
      isRecord(item)
        ? Object.entries(item).map(
            ([method, operation]) =>
              `${method.toUpperCase()} ${route} — ${summaryOf(operation)}`.trimEnd(),
          )
        : [],
    )
    .join("\n");

const routeKey = (route: string): string =>
  route.replace(/\{([^}]+)\}/g, ":$1").replace(/:[^/]+/g, ":");

const narrowed = (paths: Record<string, unknown>, wanted: string): string => {
  const wantedKey = routeKey(wanted);
  const match = Object.entries(paths).find(([route]) => routeKey(route) === wantedKey);

  return match === undefined
    ? `no documented path matches ${wanted}`
    : JSON.stringify({ [match[0]]: match[1] }, null, 2);
};

export const apiDocs = async (config: McpConfig, args: unknown): Promise<ToolResult> => {
  const { path } = Value.Decode(schema, args ?? {});
  const document = await callApi(config, { method: "GET", path: "/docs/json" });

  if (!document.ok) return document;

  const paths = pathsOf(document.text);

  if (paths === null) {
    return { ok: false, text: "the api answered with something that is not an openapi document" };
  }

  const text = path === undefined ? listed(paths) : narrowed(paths, path);

  return { ok: true, text: text.slice(0, MAX_DOCS_CHARS) };
};

export const apiDocsTool: Tool = {
  name: "api_docs",
  description:
    "Endpoints of the Wasanni API. No arguments lists every METHOD /path with its summary; { path } returns that route's request and response schemas. Read this before writing any request so no endpoint is invented.",
  readOnly: true,
  schema,
  run: apiDocs,
};
