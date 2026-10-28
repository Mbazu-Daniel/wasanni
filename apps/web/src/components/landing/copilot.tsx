import { IconWand, IconPlug, IconBug } from "@tabler/icons-react";
import { Reveal } from "@/components/motion-kit";

const tracks = [
  {
    icon: IconWand,
    title: "Scaffold the game",
    body: "Start from a template that already opens sessions and posts scores, instead of an empty folder and a week of wiring.",
  },
  {
    icon: IconPlug,
    title: "Wire your build",
    body: "Point it at your engine export and it writes the session, score, and webhook calls against your own key and platform entries.",
  },
  {
    icon: IconBug,
    title: "Fix the deploy",
    body: "When a bundle is marked failed, it names the file that broke, the header that was missing, and the change that clears it.",
  },
];

export function Copilot() {
  return (
    <section id="copilot" className="scroll-mt-20 border-b border-mist/15">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="font-poster text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-chalk sm:text-5xl">
            More help for developers. <span className="text-signal">Coming next.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-chalk/85">
            The core platform is live today. We are building an optional copilot
            inside the dashboard to help developers scaffold a game, wire an
            existing export to the API, and diagnose a failed deploy.
          </p>
          <p className="mt-4 inline-block rounded-full border border-signal/30 bg-signal/12 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
            In development · not live yet
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-3">
          {tracks.map((track, index) => (
            <Reveal key={track.title} delay={index * 0.05} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-mist/15 bg-abyss p-7">
                <span className="grid size-10 place-items-center rounded-xl border border-signal/25 bg-signal/12 text-signal">
                  <track.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-poster text-2xl font-bold uppercase leading-none text-chalk">
                  {track.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-mist">
                  {track.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
