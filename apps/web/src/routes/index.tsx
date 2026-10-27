import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchOrganizations, requireSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    if (typeof window === "undefined") return;

    await requireSession();

    const organizations = await context.queryClient.ensureQueryData({
      queryKey: ["organizations"],
      queryFn: fetchOrganizations,
      staleTime: 30_000,
    });

    if (organizations.length === 0) {
      throw redirect({ to: "/onboarding" });
    }

    const lastSlug = localStorage.getItem("wasanni:last-org");
    const target = organizations.find((org) => org.slug === lastSlug) ?? organizations[0];

    if (target === undefined) throw redirect({ to: "/onboarding" });

    localStorage.setItem("wasanni:last-org", target.slug);

    throw redirect({
      to: "/o/$orgSlug/overview",
      params: { orgSlug: target.slug },
    });
  },
});
