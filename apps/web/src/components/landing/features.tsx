import {
  IconCloudUpload,
  IconTemplate,
  IconKey,
  IconFlame,
  IconShieldCheck,
  IconTrophy,
  IconSwords,
  IconRotateClockwise,
  IconWebhook,
} from "@tabler/icons-react";
import { Reveal } from "@/components/motion-kit";

const features = [
  {
    icon: IconCloudUpload,
    title: "Game hosting",
    body: "Upload a zip or a single file. We extract it, check it against what you declared, and serve it at its own /play URL. Turn on cross-origin isolation and threaded Godot or Unity WebGL builds run in the tab.",
    surface: "GET /play/:gameId/:fileId/*",
  },
  {
    icon: IconTemplate,
    title: "Page templates",
    body: "Wrap the game, or a tournament page, in the HTML, CSS and assets you own. Uploaded the same way, served from the same place.",
    surface: "POST …/templates/:id/upload",
  },
  {
    icon: IconKey,
    title: "Platforms & keys",
    body: "One entry per platform you ship to, and a key for each. The key stays on your server; the player gets a short-lived token that grants one score and nothing else.",
    surface: "POST …/platforms/:id/keys",
  },
  {
    icon: IconFlame,
    title: "Play sessions",
    body: "Open a session, hand the client its token, close it when the run ends. Each session gets a realtime room for play that happens between clients.",
    surface: "POST /sessions",
  },
  {
    icon: IconShieldCheck,
    title: "Verified scores",
    body: "Every score is stored. Server-side rules and an optional callback add review flags without hiding the player’s result.",
    surface: "POST /sessions/:id/score",
  },
  {
    icon: IconTrophy,
    title: "Leaderboards",
    body: "The best score each player holds on one game, on one platform. A flagged score stays off the leaderboard until you ask for it, and hiding a player never deletes the record.",
    surface: "GET /games/:id/leaderboards",
  },
  {
    icon: IconSwords,
    title: "Tournaments",
    body: "Decided by best score, or by head-to-head bracket. Register the players, seed the bracket, and each round fills itself in with the winners.",
    surface: "POST /tournaments/:id/players/:id/join",
  },
  {
    icon: IconRotateClockwise,
    title: "Replays",
    body: "A session keeps its events in order, and those events are the replay. Patch the game next month and last tournament's record run still plays.",
    surface: "GET /sessions/:id/events",
  },
  {
    icon: IconWebhook,
    title: "Webhooks",
    body: "Signed deliveries for session opens and ends, scores submitted and hidden. Every payload carries an event ID, so a retry is safe to accept.",
    surface: "POST …/platforms/:id/webhooks",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-mist/15">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="font-poster text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-chalk sm:text-5xl">
            Your game stack. <span className="text-signal">One platform.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-chalk/85">
            Host the build, connect your player identity, and run the systems
            that make a game competitive. Wasanni gives your team the game
            hosting and developer APIs to ship the full loop from one place.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-2xl border border-mist/15 bg-mist/12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.04} className="h-full">
              <article className="flex h-full flex-col bg-abyss p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-signal/25 bg-signal/12 text-signal">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="font-poster text-2xl font-bold uppercase leading-none text-chalk">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-mist">
                  {feature.body}
                </p>
                <p className="mt-5 font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-signal">
                  {feature.surface}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
