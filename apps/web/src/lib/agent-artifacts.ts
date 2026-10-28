export type ArtifactFile = {
  readonly name: string;
  readonly language: string;
  readonly body: string;
  readonly complete: boolean;
};

export type MessageSegment =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "file"; readonly file: ArtifactFile };

const FENCE = /```([a-zA-Z+]+)?[ \t]*(?:\|[ \t]*([^\n]+))?[ \t]*\r?\n([\s\S]*?)```/g;
const OPEN_FENCE = /^[ \t]*```([a-zA-Z+]+)?[ \t]*(?:\|[ \t]*([^\n]+))?[ \t]*\r?\n/m;

const DEFAULT_NAMES: Record<string, string> = {
  html: "index.html",
  htm: "index.html",
  css: "styles.css",
  js: "game.js",
  javascript: "game.js",
  json: "data.json",
  ts: "game.ts",
  typescript: "game.ts",
};

const baseName = (name: string): string => name.replace(/^\.?\//, "");

const fileOf = (
  language: string,
  named: string,
  files: readonly ArtifactFile[],
  body: string,
  complete: boolean,
): ArtifactFile => ({
  name:
    named === ""
      ? (DEFAULT_NAMES[language] ?? `snippet-${files.length + 1}.${language || "txt"}`)
      : baseName(named),
  language,
  body,
  complete,
});

const parseMessage = (text: string): {
  segments: MessageSegment[];
  files: ArtifactFile[];
} => {
  const segments: MessageSegment[] = [];
  const files: ArtifactFile[] = [];
  let cursor = 0;

  for (const match of text.matchAll(FENCE)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, start) });
    }

    const file = fileOf(
      (match[1] ?? "").toLowerCase(),
      match[2]?.trim() ?? "",
      files,
      match[3] ?? "",
      true,
    );

    segments.push({ kind: "file", file });
    files.push(file);
    cursor = start + match[0].length;
  }

  const rest = text.slice(cursor);
  const open = OPEN_FENCE.exec(rest);

  if (open === null) {
    if (rest !== "") {
      segments.push({ kind: "text", value: rest });
    }

    return { segments, files };
  }

  const before = rest.slice(0, open.index);

  if (before.trim() !== "") {
    segments.push({ kind: "text", value: before });
  }

  const writing = fileOf(
    (open[1] ?? "").toLowerCase(),
    open[2]?.trim() ?? "",
    files,
    rest.slice(open.index + open[0].length),
    false,
  );

  segments.push({ kind: "file", file: writing });
  files.push(writing);

  return { segments, files };
};

export const segmentsOf = (text: string): MessageSegment[] =>
  parseMessage(text).segments;

const filesOf = (text: string): ArtifactFile[] => parseMessage(text).files;

const inlineAssets = (document: string, files: ArtifactFile[]): string => {
  const named = (name: string): ArtifactFile | undefined =>
    files.find((file) => baseName(file.name) === baseName(name));

  return document
    .replace(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
      (tag, href: string) => {
        const asset = named(href);

        return asset === undefined || !asset.name.endsWith(".css")
          ? tag
          : `<style>\n${asset.body.trim()}\n</style>`;
      },
    )
    .replace(
      /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
      (tag, src: string) => {
        const asset = named(src);

        return asset === undefined || !/\.(js|mjs|ts)$/.test(asset.name)
          ? tag
          : `<script>\n${asset.body.trim()}\n</script>`;
      },
    );
};

export function extractArtifacts(text: string): {
  html: string | null;
  files: ArtifactFile[];
} {
  const files = filesOf(text);
  const finished = files.filter((file) => file.complete);
  const entry =
    finished.find((file) => file.name === "index.html") ??
    finished.find((file) => file.name.endsWith(".html")) ??
    finished.find((file) => file.language === "html");

  return {
    html:
      entry === undefined
        ? null
        : inlineAssets(entry.body, finished.filter((file) => file !== entry)),
    files,
  };
}

export type ArtifactView = {
  readonly html: string | null;
  readonly files: ArtifactFile[];
  readonly drafting: boolean;
};

export const artifactView = (writing: string | null, shown: string): ArtifactView => {
  const finished = extractArtifacts(shown);

  if (writing === null) return { ...finished, drafting: false };

  const current = extractArtifacts(writing);
  const newest = current.files[current.files.length - 1];

  return {
    html: current.html ?? finished.html,
    files: current.files.length === 0 ? finished.files : current.files,
    drafting: newest !== undefined && !newest.complete,
  };
};
