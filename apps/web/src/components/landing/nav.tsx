import * as React from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

const links = [
  { label: "Platform", href: "#features" },
  { label: "Deploy", href: "#integration" },
  { label: "Competition", href: "#board" },
  { label: "Roadmap", href: "#copilot" },
];

export function Nav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-mist/15 bg-night/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-poster text-2xl font-black uppercase tracking-tight text-chalk">
            Wasanni
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-signal sm:inline">
            /api/v1
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-[0.14em] text-mist underline-offset-4 transition-colors hover:text-chalk hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/sign-up"
            className="action px-4 py-2 font-mono text-xs uppercase tracking-[0.14em]"
          >
            Start hosting
          </Link>
        </div>

        <button
          className="grid size-10 place-items-center rounded-full border border-mist/30 text-chalk md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
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
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-mist/15 bg-abyss md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 font-mono text-sm uppercase tracking-[0.14em] text-mist"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/sign-up"
                onClick={() => setOpen(false)}
                className="action mt-3 inline-flex w-fit px-5 py-2.5 font-mono text-sm uppercase tracking-[0.14em]"
              >
                Start hosting
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
