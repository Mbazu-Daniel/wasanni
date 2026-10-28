import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { apiBaseURL } from "@/lib/auth-client";
import type { DocList } from "@wasanni/contracts";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export const Route = createFileRoute("/docs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Integration docs · Wasanni" },
      {
        name: "description",
        content:
          "How to integrate a game with Wasanni: api keys, sessions, scores, leaderboards, realtime, webhooks, tournaments, and matches.",
      },
    ],
  }),
  component: DocsLayout,
});

export const fetchDocs = async (): Promise<DocList> =>
  apiFetch<DocList>("/api/v1/docs");

function DocsLayout() {
  const { data } = useQuery({
    queryKey: ["docs"],
    queryFn: fetchDocs,
    staleTime: Infinity,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
          <Link to="/docs" className="font-poster text-2xl font-black uppercase tracking-tight">
            Wasanni
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              /docs
            </span>
          </Link>
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <a href={`${apiBaseURL}/api/v1/docs`} className="transition-colors hover:text-foreground">
              json
            </a>
            <a href={`${apiBaseURL}/llms.txt`} className="transition-colors hover:text-foreground">
              llms.txt
            </a>
            <Link to="/sign-in" className="transition-colors hover:text-foreground">
              sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <DocsSidebar docs={data?.docs ?? []} />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
