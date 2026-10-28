import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgSlug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$orgSlug/settings/organization",
      params: { orgSlug: params.orgSlug },
      replace: true,
    });
  },
});
