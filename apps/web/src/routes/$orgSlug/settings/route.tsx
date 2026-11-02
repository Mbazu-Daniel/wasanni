import { createFileRoute, Link, Outlet, useMatchRoute, useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$orgSlug/settings")({
  component: SettingsLayout,
});

const items = [
  { label: "Organization", to: "/$orgSlug/settings/organization" },
  { label: "Account", to: "/$orgSlug/settings/account" },
  { label: "Sessions", to: "/$orgSlug/settings/sessions" },
] as const;

function SettingsLayout() {
  const { orgSlug } = useParams({ from: "/$orgSlug/settings" });
  const matchRoute = useMatchRoute();

  return (
    <div className="flex min-h-0 flex-col gap-6 sm:flex-row">
      <aside className="w-full shrink-0 sm:w-48">
        <nav className="flex gap-1 overflow-x-auto sm:flex-col">
          {items.map((item) => {
            const active = Boolean(
              matchRoute({ to: item.to, params: { orgSlug } }),
            );

            return (
              <Link
                key={item.label}
                to={item.to}
                params={{ orgSlug }}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-ink/[0.08] font-medium text-foreground"
                    : "text-muted-foreground hover:bg-ink/[0.04] hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
