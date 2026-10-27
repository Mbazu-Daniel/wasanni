import * as React from "react";
import { motion } from "motion/react";
import { useLocation } from "@tanstack/react-router";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const STORAGE_KEY = "wasanni:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-7xl px-6 py-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
