import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { IconChevronDown, IconCheck, IconPlus } from "@tabler/icons-react";
import { fetchOrganizations } from "@/lib/session";
import { cn } from "@/lib/utils";

export function OrgSwitcher() {
  const { orgSlug } = useParams({ from: "/o/$orgSlug" });
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
    staleTime: 30_000,
  });

  const current = organizations.find((org) => org.slug === orgSlug);

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 text-sm transition-colors hover:border-pink/30 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="grid size-5 place-items-center rounded bg-[linear-gradient(135deg,#ff2e88,#2e7bff)] font-mono text-[10px] font-bold text-ink">
          {(current?.name ?? orgSlug).charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[180px] truncate font-medium">
          {current?.name ?? orgSlug}
        </span>
        <IconChevronDown className="size-3.5 text-muted-foreground" />
      </summary>

      <div className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-border bg-popover p-1 shadow-2xl">
        <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Organizations
        </p>
        {organizations.map((org) => (
          <Link
            key={org.id}
            to="/o/$orgSlug/overview"
            params={{ orgSlug: org.slug }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/[0.06]"
          >
            <span className="grid size-5 place-items-center rounded bg-[linear-gradient(135deg,#ff2e88,#2e7bff)] font-mono text-[10px] font-bold text-ink">
              {org.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{org.name}</span>
            {org.slug === orgSlug && <IconCheck className="size-3.5 text-pink" />}
          </Link>
        ))}
        <div className="my-1 h-px bg-border" />
        <Link
          to="/onboarding"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
        >
          <IconPlus className="size-3.5" />
          Create organization
        </Link>
      </div>
    </details>
  );
}
