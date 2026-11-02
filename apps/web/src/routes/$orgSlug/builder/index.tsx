import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/components/builder/agents-page";

export const Route = createFileRoute("/$orgSlug/builder/")({
  head: () => ({ meta: [{ title: "Builder · Wasanni" }] }),
  component: BuilderRoute,
});

function BuilderRoute() {
  const { org } = Route.useRouteContext();

  return org === null ? null : <AgentsPage org={org} />;
}
