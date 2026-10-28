import { createFileRoute, Link, Outlet, useMatchRoute, useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$orgSlug/settings")({
  component: SettingsLayout,
});

const tabs = [
  { label: "Organization", to: "/$orgSlug/settings/organization" },
  { label: "Members", to: "/$orgSlug/settings/members" },
  { label: "Providers", to: "/$orgSlug/settings/providers" },
  { label: "Account", to: "/$orgSlug/settings/account" },
  { label: "Danger zone", to: "/$orgSlug/settings/danger" },
] as const;

function SettingsLayout() {
  const { orgSlug } = useParams({ from: "/$orgSlug/settings" });
  const matchRoute = useMatchRoute();

  return (
    <div className="space-y-6 pb-10">
      <div role="tablist" aria-label="Settings" className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = Boolean(
            matchRoute({ to: tab.to, params: { orgSlug } }),
          );

          return (
            <Link
              key={tab.label}
              to={tab.to}
              params={{ orgSlug }}
              role="tab"
              aria-selected={active}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-pink text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
