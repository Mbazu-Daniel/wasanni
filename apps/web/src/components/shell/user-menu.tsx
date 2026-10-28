import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { IconLogout, IconUser, IconSettings } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { fetchSession } from "@/lib/session";

export function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });

  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    navigate({ to: "/sign-in", search: { returnTo: undefined } });
  }

  return (
    <details className="group relative">
      <summary
        className="grid size-9 cursor-pointer list-none place-items-center rounded-full border border-border bg-white/[0.02] text-sm font-semibold text-foreground transition-colors hover:border-pink/30 [&::-webkit-details-marker]:hidden"
      >
        {initials}
      </summary>

      <div className="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-border bg-popover p-1 shadow-2xl">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{user?.name ?? "Signed in"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <span
          title="Not built yet"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/40"
        >
          <IconUser className="size-3.5" />
          Account
        </span>
        <span
          title="Not built yet"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/40"
        >
          <IconSettings className="size-3.5" />
          Organization
        </span>
        <div className="my-1 h-px bg-border" />
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-rose-300 hover:bg-rose-400/10"
        >
          <IconLogout className="size-3.5" />
          Sign out
        </button>
      </div>
    </details>
  );
}
