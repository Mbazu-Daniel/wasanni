import { SidebarTrigger } from "@/components/ui/sidebar";

export function Topbar() {
  return (
    <header className="app-topbar flex h-14 shrink-0 items-center gap-3 border-b border-launch-ink/22 bg-launch-paper/90 px-4 backdrop-blur-md md:hidden">
      <SidebarTrigger aria-label="Toggle sidebar" />
    </header>
  );
}
