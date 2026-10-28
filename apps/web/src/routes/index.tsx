import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  const navigate = Route.useNavigate();

  React.useEffect(() => {
    void resumeLastOrganizationSlug()
      .then((slug) => {
        if (slug === undefined) return;
        if (slug === null) {
          navigate({ to: "/onboarding" });
          return;
        }
        navigate({ to: "/$orgSlug/overview", params: { orgSlug: slug } });
      })
      .catch(() => undefined);
  }, [navigate]);

  return <Landing />;
}
