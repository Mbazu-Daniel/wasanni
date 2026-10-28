import {
  IconBrandGithub,
  IconBrandX,
  IconBrandDiscord,
  IconHeart,
} from "@tabler/icons-react";
import { Separator } from "@/components/marketing/separator";

const columns = [
  {
    title: "Product",
    links: ["Platform", "Replays", "Leaderboards", "Tournaments", "Matches"],
  },
  {
    title: "Developers",
    links: ["API reference", "SDK", "Webhooks", "Status", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact", "Privacy"],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,0.8fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#ff2e88,#2e7bff)] font-mono text-xs font-bold text-ink">
                W
              </span>
              <span className="font-display text-lg font-bold">Wasanni</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sessions, scores, tournaments, and replays for games. Built for
              studios that would rather ship the game.
            </p>
            <div className="mt-5 flex gap-2">
              {[IconBrandGithub, IconBrandX, IconBrandDiscord].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-pink/40 hover:text-foreground"
                  aria-label="Social"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-1.5">
            © {new Date().getFullYear()} Wasanni. Built with{" "}
            <IconHeart className="size-3.5 text-pink" /> for game studios.
          </p>
          <p className="font-mono">status: all systems nominal</p>
        </div>
      </div>
    </footer>
  );
}
