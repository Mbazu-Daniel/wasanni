import * as React from "react";
import { useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppSidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { ShortcutsHelp } from "./shortcuts-help";
import { useDashboardShortcuts } from "./keyboard-shortcuts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const STORAGE_KEY = "wasanni:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(
    () => localStorage.getItem(STORAGE_KEY) !== "true",
  );
  const location = useLocation();

  const togglePalette = React.useCallback(
    () => setCommandOpen((value) => !value),
    [],
  );
  const openPalette = React.useCallback(() => setCommandOpen(true), []);
  const openHelp = React.useCallback(() => setHelpOpen(true), []);

  useDashboardShortcuts({ togglePalette, openPalette, openHelp });

  const immersive = location.pathname.endsWith("/agents");

  return (
    <TooltipProvider>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(open) => {
          setSidebarOpen(open);
          localStorage.setItem(STORAGE_KEY, String(!open));
        }}
        className="app-shell h-screen w-screen overflow-hidden bg-launch-paper"
        style={
          {
            "--sidebar-width": "18rem",
            "--sidebar-width-icon": "4rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <Topbar />
          <div
            className={
              immersive ? "relative flex-1 overflow-hidden" : "relative flex-1 overflow-y-auto"
            }
          >
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={
                immersive
                  ? "flex h-full w-full flex-col"
                  : "mx-auto w-full max-w-[96rem] px-6 py-6 @container"
              }
            >
              <Breadcrumbs />
              <div className={immersive ? "min-h-0 flex-1" : "mt-3"}>{children}</div>
            </motion.div>
          </div>
        </SidebarInset>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </SidebarProvider>
    </TooltipProvider>
  );
}
