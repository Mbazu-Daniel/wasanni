import * as React from "react";
import {
  IconBuilding,
  IconBroadcast,
  IconDeviceGamepad2,
  IconSettings,
  IconPlayerPlay,
  IconBolt,
  IconTrophy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion-kit";

const steps = [
  {
    icon: IconBuilding,
    title: "Organization",
    body: "A studio, its members, and its roles. Every query is scoped to it.",
  },
  {
    icon: IconBroadcast,
    title: "Platform",
    body: "Where the game is played. The platform owns API keys and webhooks.",
  },
  {
    icon: IconDeviceGamepad2,
    title: "Game",
    body: "Hosted with a bundle, or external and API-only. One field decides.",
  },
  {
    icon: IconSettings,
    title: "Assignment and config",
    body: "The game is assigned to a platform. The config holds modes and score rules. It can be empty.",
  },
  {
    icon: IconPlayerPlay,
    title: "Session",
    body: "The platform creates it. The player ID, mode, config, and tournament are recorded.",
  },
  {
    icon: IconBolt,
    title: "Play",
    body: "The game talks to the realtime tier. Events land in Redis through one contract.",
  },
  {
    icon: IconTrophy,
    title: "Score and match",
    body: "One score per session. Flags are added, never a rejection. A match advances from placements.",
  },
  {
    icon: IconRotateClockwise,
    title: "Replay",
    body: "Events pack into R2. The score row keeps the byte range. The game plays it back from the seed.",
  },
];

export function Flow() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="flow" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(46,123,255,0.10),transparent_55%),radial-gradient(ellipse_at_80%_60%,rgba(255,46,136,0.10),transparent_55%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <Badge>The play path</Badge>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              Eight steps from a build to a leaderboard.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Each step uses the data of the step before it. Nothing is
              duplicated and nothing is guessed.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-10 hidden lg:block">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                live path
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "organization",
                  "platform",
                  "game",
                  "assignment",
                  "session",
                  "event",
                  "score",
                  "archive",
                ].map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full border border-border font-mono text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs text-foreground">{label}</span>
                    <span className="ml-auto h-px flex-1 bg-gradient-to-r from-pink/40 to-transparent" />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div ref={ref} className="relative">
          <div className="absolute left-[27px] top-2 h-full w-px bg-white/[0.07] sm:left-[31px]" />
          <motion.div
            className="absolute left-[27px] top-2 w-px origin-top bg-[linear-gradient(to_bottom,#ff2e88,#2e7bff)] sm:left-[31px]"
            style={{ scaleY, height: "100%" }}
          />
          <motion.div
            className="absolute left-[27px] size-2 -translate-x-1/2 rounded-full bg-pink shadow-[0_0_18px_4px_rgba(255,46,136,0.6)] sm:left-[31px]"
            style={{ top: glowY }}
          />

          <div className="space-y-5">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.04} y={36}>
                <div className="relative flex gap-5 sm:gap-6">
                  <div className="relative z-10 mt-1 grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-card text-blue-soft shadow-[0_0_0_6px_#05060f] sm:size-16">
                    <step.icon className="size-6" />
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-pink/25 hover:bg-card/70">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
