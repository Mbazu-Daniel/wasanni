import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { IconChevronDown, IconCheck, IconPlus } from "@tabler/icons-react";
import { fetchOrganizations } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useMenuDisclosure } from "./use-menu-disclosure";

export function OrgSwitcher() {
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
    staleTime: 30_000,
  });

  const current = organizations.find((org) => org.slug === orgSlug);

  return (
    <details ref={useMenuDisclosure()} className="group relative">
      <summary
        className={cn(
          "flex h-9 w-full cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-ink/[0.04] px-2 text-sm transition-colors hover:border-pink/30 hover:bg-ink/[0.06] [&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded bg-primary font-mono text-[11px] font-bold text-primary-foreground">
          {(current?.name ?? orgSlug).charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-left font-medium group-data-[collapsible=icon]:hidden">
          {current?.name ?? orgSlug}
        </span>
        <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </summary>

      <div className="absolute left-0 top-full z-50 mt-1 w-max min-w-[240px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-2xl">
        <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Organizations
        </p>
        {organizations.map((org) => (
          <Link
            key={org.id}
            to="/$orgSlug/overview"
            params={{ orgSlug: org.slug }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink/[0.08]"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              {org.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{org.name}</span>
            {org.slug === orgSlug && <IconCheck className="size-3.5 text-pink" />}
          </Link>
        ))}
        <div className="my-1 h-px bg-border" />
        <Link
          to="/onboarding"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-ink/[0.08]"
        >
          <IconPlus className="size-3.5" />
          Create organization
        </Link>
      </div>
    </details>
  );
}
