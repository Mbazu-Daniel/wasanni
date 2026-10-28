export type Doc = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly order: number;
  readonly markdown: string;
};

const CONTENT_DIR = `${import.meta.dir}/content`;

const frontMatterOf = (text: string, file: string): Record<string, string> => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error(`${file} has no front matter`);
  }

  const meta: Record<string, string> = {};

  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return meta;
};

const bodyOf = (text: string): string => {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);

  return match === null ? text : text.slice(match[0].length);
};

const toDoc = (file: string, text: string): Doc => {
  const meta = frontMatterOf(text, file);
  const order = Number(meta["order"]);

  if (meta["title"] === undefined || meta["title"] === "") {
    throw new Error(`${file} has no title in its front matter`);
  }

  if (meta["summary"] === undefined || meta["summary"] === "") {
    throw new Error(`${file} has no summary in its front matter`);
  }

  if (!Number.isInteger(order)) {
    throw new Error(`${file} has no integer order in its front matter`);
  }

  return {
    slug: file.slice(0, -".md".length),
    title: meta["title"],
    summary: meta["summary"],
    order,
    markdown: bodyOf(text),
  };
};

let loaded: Promise<Doc[]> | undefined;

export const readDocs = (): Promise<Doc[]> => {
  if (loaded === undefined) {
    loaded = (async () => {
      const files = [...new Bun.Glob("*.md").scanSync({ cwd: CONTENT_DIR })].sort();

      const docs = await Promise.all(
        files.map(async (file) => toDoc(file, await Bun.file(`${CONTENT_DIR}/${file}`).text())),
      );

      return docs.sort((left, right) => left.order - right.order);
    })();
  }

  return loaded;
};

export const findDoc = async (slug: string): Promise<Doc | undefined> =>
  (await readDocs()).find((doc) => doc.slug === slug);

export const llmsText = (docs: readonly Doc[], baseUrl: string): string =>
  [
    "# Wasanni integration docs",
    "",
    "The API a browser game calls to record scores, rank players and run tournaments.",
    "",
    "## Guides",
    "",
    ...docs.map((doc) => `- [${doc.title}](${baseUrl}/api/v1/docs/${doc.slug}): ${doc.summary}`),
    "",
    `## Full endpoint list: ${baseUrl}/docs/json`,
    "",
  ].join("\n");
