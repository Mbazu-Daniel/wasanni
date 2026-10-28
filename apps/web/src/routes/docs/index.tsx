import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchDocs } from "./route";

export const Route = createFileRoute("/docs/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    if (typeof window === "undefined") return;

    const { docs } = await context.queryClient.ensureQueryData({
      queryKey: ["docs"],
      queryFn: fetchDocs,
      staleTime: Infinity,
    });

    const first = docs[0];

    if (first === undefined) return;

    throw redirect({ to: "/docs/$slug", params: { slug: first.slug } });
  },
  component: DocsIndex,
});

function DocsIndex() {
  return (
    <p className="text-[15px] text-muted-foreground">
      No guide is published yet. The corpus lives with the API.
    </p>
  );
}
