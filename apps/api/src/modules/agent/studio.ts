import { dirname, extname, join } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

export function findStudioAssets(from: string): string | undefined {
  let current = from;
  for (;;) {
    const candidate = join(current, "node_modules", "mastra", "dist", "studio");
    if (isDirectory(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function isStudioAssetPath(pathname: string): boolean {
  const asset = /(^|\/)assets\//.test(pathname) || /(^|\/)dist\/assets\//.test(pathname);
  const icon = /(^|\/)mastra\.svg$/.test(pathname);
  return asset || icon;
}

export function loadStudioPage(assets: string, config: Record<string, string>) {
  const html = new TextDecoder()
    .decode(readFileSync(join(assets, "index.html")))
    .replaceAll(/%%(\w+)%%/g, (whole: string, key: string) => config[key] ?? whole);
  return { html, gzipped: gzipSync(html) };
}

export function fetchStudioPage(request: Request, page: ReturnType<typeof loadStudioPage>): Response {
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", Vary: "Accept-Encoding" };
  if (request.headers.get("Accept-Encoding")?.includes("gzip")) {
    return new Response(page.gzipped, {
      headers: { ...headers, "Content-Encoding": "gzip" },
    });
  }
  return new Response(page.html, { headers });
}

export async function fetchStudioAsset(request: Request, assets: string): Promise<Response> {
  const url = new URL(request.url);
  const resolved = join(assets, url.pathname.replace(/^\/+/, ""));
  if (isDirectory(resolved)) return notFound();

  const file = Bun.file(resolved);
  if (resolved.startsWith(assets) && (await file.exists())) {
    return new Response(file, {
      headers: { "Content-Type": mimeType(resolved) ?? "application/octet-stream" },
    });
  }
  return notFound();
}

function mimeType(path: string): string | undefined {
  switch (extname(path)) {
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return undefined;
  }
}

function notFound(): Response {
  return new Response("404 Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export function studioHtmlConfig(host: string, port: number): Record<string, string> {
  return {
    MASTRA_STUDIO_BASE_PATH: "",
    MASTRA_SERVER_HOST: host,
    MASTRA_SERVER_PORT: String(port),
    MASTRA_SERVER_PROTOCOL: "http",
    MASTRA_API_PREFIX: "/api",
    MASTRA_EXPERIMENTAL_FEATURES: process.env.EXPERIMENTAL_FEATURES === "true" ? "true" : "false",
    MASTRA_TEMPLATES: process.env.MASTRA_TEMPLATES === "true" ? "true" : "false",
    MASTRA_CLOUD_API_ENDPOINT: "",
    MASTRA_HIDE_CLOUD_CTA: "",
    MASTRA_TELEMETRY_DISABLED: process.env.MASTRA_TELEMETRY_DISABLED ?? "",
    MASTRA_REQUEST_CONTEXT_PRESETS: process.env.MASTRA_REQUEST_CONTEXT_PRESETS ?? "",
    MASTRA_EXPERIMENTAL_UI: process.env.MASTRA_EXPERIMENTAL_UI === "true" ? "true" : "false",
    MASTRA_AGENT_SIGNALS: process.env.MASTRA_AGENT_SIGNALS === "false" ? "false" : "true",
    MASTRA_SIGNALS_UI: process.env.MASTRA_SIGNALS_UI === "true" ? "true" : "false",
    MASTRA_ORGANIZATION_ID: "",
    MASTRA_PLATFORM_PROJECT_ID: "",
    MASTRA_PLATFORM_OBSERVABILITY_ENDPOINT: "",
  };
}
