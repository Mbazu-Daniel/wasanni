import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { resumeLastOrganizationSlug } from "@/lib/session";
import { Landing } from "@/components/landing/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wasanni — Build it. Play it. Bring a crowd." },
      { name: "theme-color", content: "#06141b" },
      {
        name: "description",
        content:
          "Wasanni is the developer platform for hosting browser games and building the competitive world around them with sessions, verified scores, leaderboards, tournaments, and replays.",
      },
    ],
  }),
  component: LandingIndex,
});

function LandingIndex() {
  const { data } = useQuery({
    queryKey: ["resume-organization"],
    queryFn: async () => ({ slug: await resumeLastOrganizationSlug() }),
    retry: false,
  });

  if (data?.slug === null) return <Navigate to="/onboarding" />;
  if (data?.slug !== undefined) {
    return <Navigate to="/$orgSlug/overview" params={{ orgSlug: data.slug }} />;
  }

  return <Landing />;
}
