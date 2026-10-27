import * as React from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { IconMenu2, IconX, IconBrandGithub, IconArrowUpRight } from "@tabler/icons-react";
import { Button } from "@/components/marketing/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Flow", href: "#flow" },
  { label: "Leaderboards", href: "#leaderboards" },
  { label: "Replays", href: "#replays" },
  { label: "API", href: "#api" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-ink/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#" className="group flex items-center gap-2.5">
          <span className="relative grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#ff2e88,#2e7bff)]">
            <span className="absolute inset-[2px] rounded-[10px] bg-ink" />
            <span className="relative font-mono text-sm font-bold text-gradient-pink-blue">
              W
            </span>
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Wasanni</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute inset-x-4 -bottom-px h-px scale-x-0 bg-[linear-gradient(90deg,#ff2e88,#2e7bff)] transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-pink/40 hover:text-foreground"
            aria-label="GitHub"
          >
            <IconBrandGithub className="size-4" />
          </a>
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
          <Button variant="gradient" size="sm" className="gap-1.5">
            Start building
            <IconArrowUpRight className="size-3.5" />
          </Button>
        </div>

        <button
          className="grid size-10 place-items-center rounded-full border border-border text-foreground md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
        >
          {open ? <IconX className="size-5" /> : <IconMenu2 className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <Button variant="gradient" className="mt-2 w-full">
                Start building
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
