import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { DocList, DocView } from "@wasanni/contracts";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { fetchDocs } from "./route";

export const Route = createFileRoute("/docs/$slug")({
  ssr: false,
  component: GuidePage,
});

const fetchGuide = (slug: string) => apiFetch<DocView>(`/api/v1/docs/${slug}`);

function GuidePage() {
  const { slug } = Route.useParams();

  const guide = useQuery({
    queryKey: ["doc", slug],
    queryFn: () => fetchGuide(slug),
    staleTime: Infinity,
    retry: false,
  });

  const { data: listing } = useQuery({
    queryKey: ["docs"],
    queryFn: fetchDocs,
    staleTime: Infinity,
  });

  if (guide.isPending) {
    return <p className="text-[15px] text-muted-foreground">Loading the guide…</p>;
  }

  if (guide.isError) {
    const missing = guide.error instanceof ApiError && guide.error.status === 404;

    return (
      <div className="space-y-4">
        <h1 className="font-poster text-3xl font-black uppercase tracking-tight">
          {missing ? "No such guide" : "The guide did not load"}
        </h1>
        <p className="text-[15px] text-muted-foreground">{guide.error.message}</p>
        <Link
          to="/docs/$slug"
          params={{ slug: "quickstart" }}
          className="font-mono text-xs uppercase tracking-[0.14em] text-primary"
        >
          Start with the quickstart
        </Link>
      </div>
    );
  }

  return (
    <article>
      <DocsMarkdown text={guide.data.markdown} />
      <GuidePager docs={listing ?? null} slug={slug} />
    </article>
  );
}

function GuidePager({ docs, slug }: { docs: DocList | null; slug: string }) {
  const index = docs?.docs.findIndex((doc) => doc.slug === slug) ?? -1;

  if (docs === null || index === -1) return null;

  const previous = docs.docs[index - 1];
  const next = docs.docs[index + 1];

  if (previous === undefined && next === undefined) return null;

  return (
    <nav className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6">
      {previous === undefined ? (
        <span />
      ) : (
        <Link
          to="/docs/$slug"
          params={{ slug: previous.slug }}
          className="group flex flex-col items-start"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Previous
          </span>
          <span className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
            {previous.title}
          </span>
        </Link>
      )}
      {next === undefined ? (
        <span />
      ) : (
        <Link
          to="/docs/$slug"
          params={{ slug: next.slug }}
          className="group flex flex-col items-end"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Next
          </span>
          <span className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
