import { t, type UnwrapSchema } from "elysia";

export const DOC_SLUG_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

export const DocMeta = t.Object({
  slug: t.String({ pattern: DOC_SLUG_PATTERN }),
  title: t.String(),
  summary: t.String(),
});
export type DocMeta = UnwrapSchema<typeof DocMeta>;

export const DocList = t.Object({ docs: t.Array(DocMeta) });
export type DocList = UnwrapSchema<typeof DocList>;

export const DocView = t.Object({
  slug: t.String({ pattern: DOC_SLUG_PATTERN }),
  title: t.String(),
  summary: t.String(),
  markdown: t.String(),
});
export type DocView = UnwrapSchema<typeof DocView>;

export const DocSlugParams = t.Object({
  slug: t.String({ minLength: 3, maxLength: 40, pattern: DOC_SLUG_PATTERN }),
});
export type DocSlugParams = UnwrapSchema<typeof DocSlugParams>;
