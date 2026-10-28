import { Link } from "@tanstack/react-router";

const sections = [
  { label: "Platform", href: "#features" },
  { label: "Deploy", href: "#integration" },
  { label: "Competition", href: "#board" },
  { label: "Roadmap", href: "#copilot" },
];

export function Footer() {
  return (
    <footer className="border-t border-mist/15 bg-abyss">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-poster text-2xl font-black uppercase text-chalk">
            Wasanni<span className="text-signal">.</span>
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-mist">
            The developer platform for hosting browser games and running the
            competition layer behind them.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {sections.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="font-mono text-xs uppercase tracking-[0.14em] text-mist transition-colors hover:text-signal"
            >
              {section.label}
            </a>
          ))}
          <Link
            to="/sign-in"
            className="font-mono text-xs uppercase tracking-[0.14em] text-mist transition-colors hover:text-signal"
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="rounded-full border border-signal/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-signal transition-colors hover:bg-signal/12"
          >
            Start hosting a game
          </Link>
        </nav>
      </div>
      <div className="border-t border-mist/12">
        <p className="mx-auto max-w-6xl px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-mist/80 sm:px-8">
          © {new Date().getFullYear()} Wasanni · public beta · set in Darker
          Grotesque &amp; Archivo
        </p>
      </div>
    </footer>
  );
}
