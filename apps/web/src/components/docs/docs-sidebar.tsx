import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import type { DocMeta } from "@wasanni/contracts";

export function DocsSidebar({ docs }: { docs: DocMeta[] }) {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  const current = docs.find((doc) =>
    Boolean(matchRoute({ to: "/docs/$slug", params: { slug: doc.slug } })),
  );

  return (
    <aside className="lg:sticky lg:top-10 lg:self-start">
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Integration guide
      </p>

      {docs.length > 0 && (
        <select
          value={current?.slug ?? ""}
          onChange={(event) =>
            navigate({ to: "/docs/$slug", params: { slug: event.target.value } })
          }
          className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm lg:hidden"
        >
          {current === undefined && <option value="">Choose a guide</option>}
          {docs.map((doc) => (
            <option key={doc.slug} value={doc.slug}>
              {doc.title}
            </option>
          ))}
        </select>
      )}

      <nav className="flex flex-col gap-1 max-lg:hidden">
        {docs.map((doc) => {
          const active = doc.slug === current?.slug;

          return (
            <Link
              key={doc.slug}
              to="/docs/$slug"
              params={{ slug: doc.slug }}
              className={
                active
                  ? "rounded-md border-l-2 border-primary bg-muted px-3 py-2"
                  : "rounded-md border-l-2 border-transparent px-3 py-2 transition-colors hover:bg-muted/60"
              }
            >
              <span
                className={
                  active
                    ? "block text-sm font-semibold text-foreground"
                    : "block text-sm font-medium text-muted-foreground"
                }
              >
                {doc.title}
              </span>
              {active && (
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {doc.summary}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
