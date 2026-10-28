import { Elysia } from "elysia";
import { DocList, DocSlugParams, DocView } from "@wasanni/contracts";
import { NotFoundError } from "@wasanni/kit";
import { findDoc, llmsText, readDocs } from "./catalog.ts";

const metaOf = (doc: { slug: string; title: string; summary: string }) => ({
  slug: doc.slug,
  title: doc.title,
  summary: doc.summary,
});

export const createDocsRoutes = () =>
  new Elysia({ name: "docs" })
    .get(
      "/api/v1/docs",
      async (): Promise<DocList> => ({ docs: (await readDocs()).map(metaOf) }),
      {
        detail: { tags: ["docs"], summary: "List the integration guides" },
        response: { 200: DocList },
      },
    )
    .get(
      "/api/v1/docs/:slug",
      async ({ params }): Promise<DocView> => {
        const doc = await findDoc(params.slug);

        if (doc === undefined) {
          throw new NotFoundError(`no integration guide is stored under ${params.slug}`);
        }

        return {
          slug: doc.slug,
          title: doc.title,
          summary: doc.summary,
          markdown: doc.markdown,
        };
      },
      {
        detail: { tags: ["docs"], summary: "Read one integration guide" },
        params: DocSlugParams,
        response: { 200: DocView },
      },
    )
    .get(
      "/llms.txt",
      async ({ request, set }) => {
        set.headers["content-type"] = "text/plain; charset=utf-8";

        return llmsText(await readDocs(), new URL(request.url).origin);
      },
      { detail: { tags: ["ops"], summary: "The guide index an AI agent reads first" } },
    );
