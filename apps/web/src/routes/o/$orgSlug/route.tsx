import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { fetchOrganizations, requireSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";

export const Route = createFileRoute("/o/$orgSlug")({
  ssr: false,
  beforeLoad: async ({ context, params }) => {
    if (typeof window === "undefined") return { org: null };

    await requireSession();

    const organizations = await context.queryClient.ensureQueryData({
      queryKey: ["organizations"],
      queryFn: fetchOrganizations,
      staleTime: 30_000,
    });

    const org = organizations.find((entry) => entry.slug === params.orgSlug);

    if (!org) {
      const fallback = organizations[0];

      if (fallback) {
        throw redirect({
          to: "/o/$orgSlug/overview",
          params: { orgSlug: fallback.slug },
        });
      }

      throw redirect({ to: "/onboarding" });
    }

    localStorage.setItem("wasanni:last-org", org.slug);
    return { org };
  },
  component: OrgLayout,
});

function OrgLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
