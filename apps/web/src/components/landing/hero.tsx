import * as React from "react";
import {
  IconArrowRight,
  IconPlayerPlay,
  IconTrophy,
  IconBolt,
  IconRotateClockwise,
  IconDeviceGamepad2,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { motion, useScroll, useTransform } from "motion/react";
import { Badge } from "@/components/marketing/badge";
import { Button } from "@/components/marketing/button";
import { Card } from "@/components/marketing/card";
import { Modal } from "@/components/marketing/modal";
import {
  Counter,
  CursorGlow,
  GridBackdrop,
  Magnetic,
  Orbs,
  TiltCard,
} from "@/components/motion-kit";

const headline = ["Ship", "the", "game.", "We", "run", "the", "arena."];

export function Hero() {
  const ref = React.useRef<HTMLElement>(null);
  const [replayOpen, setReplayOpen] = React.useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20"
    >
      <GridBackdrop />
      <Orbs />
      <CursorGlow />

      <motion.div
        style={{ y, opacity, scale }}
        className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-pink opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-pink" />
              </span>
              Public beta · Realtime tier live
            </Badge>
          </motion.div>

          <h1 className="mt-6 max-w-2xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            {headline.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                initial={{ opacity: 0, y: 34, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.12 + index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={
                  index >= 4
                    ? "mr-[0.22em] inline-block text-gradient-pink-blue"
                    : "mr-[0.22em] inline-block"
                }
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Wasanni runs sessions, scores, tournaments, and replays for games
            your studio already built. Host the build, or keep it on your
            servers and call the API. One integration, every platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Button variant="gradient" size="lg" className="group gap-2">
                Start building
                <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Magnetic>

            <Button variant="outline" size="lg" className="gap-2" onClick={() => setReplayOpen(true)}>
              <span className="grid size-6 place-items-center rounded-full bg-pink/15 text-pink">
                <IconPlayerPlay className="size-3 fill-pink" />
              </span>
              Watch the replay
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.8 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <IconBolt className="size-4 text-pink" />
              <Counter to={140} suffix="ms" /> p99 event round trip
            </span>
            <span className="flex items-center gap-2">
              <IconTrophy className="size-4 text-blue-soft" />
              <Counter to={26} suffix=" tables" /> · one schema
            </span>
            <span className="flex items-center gap-2">
              <IconDeviceGamepad2 className="size-4 text-cyan" />
              Godot · Unity · HTML5 · WASM
            </span>
          </motion.div>
        </div>

        <HeroArena />
      </motion.div>

      <Modal open={replayOpen} onClose={() => setReplayOpen(false)}>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,46,136,0.35),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(46,123,255,0.35),transparent_55%)]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <IconRotateClockwise className="mx-auto size-10 text-pink" />
              <p className="mt-3 font-display text-lg font-semibold">Replay preview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                47 events · 912 bytes compressed · seed 7QH2
              </p>
            </div>
          </div>
        </div>
        <button
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-ink/70 text-foreground backdrop-blur"
          aria-label="Close"
          onClick={() => setReplayOpen(false)}
        >
          <IconX className="size-4" />
        </button>
      </Modal>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground sm:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-px bg-[linear-gradient(to_bottom,#ff2e88,transparent)]"
        />
      </motion.div>
    </section>
  );
}

function HeroArena() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -left-6 top-10 hidden w-56 lg:block"
      >
        <TiltCard>
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <Badge variant="blue">Live</Badge>
              <IconRotateClockwise className="size-4 text-blue-soft" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Replay</p>
            <p className="font-mono text-sm text-foreground">scores/4KD8…/14.ndjson.zst</p>
            <div className="mt-3 flex h-10 items-end gap-1">
              {[30, 58, 42, 80, 64, 92, 50, 74, 38, 88, 60, 46].map((height, index) => (
                <motion.span
                  key={index}
                  className="flex-1 rounded-sm bg-[linear-gradient(to_top,#2e7bff,#ff2e88)]"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.9 + index * 0.04, duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </div>
          </Card>
        </TiltCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ delay: 0.65, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -right-4 bottom-6 hidden w-60 lg:block"
      >
        <TiltCard intensity={10}>
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Pixel Cup
              </p>
              <IconTrophy className="size-4 text-pink" />
            </div>
            <div className="mt-3 space-y-2">
              {[
                { name: "Tunde", score: 1200, flag: false },
                { name: "Ada", score: 980, flag: true },
                { name: "Kai", score: 910, flag: false },
              ].map((row, index) => (
                <div key={row.name} className="flex items-center gap-2">
                  <span className="w-4 font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <span className="font-mono text-xs text-foreground">{row.score}</span>
                  {row.flag && <span className="size-1.5 rounded-full bg-pink" />}
                </div>
              ))}
            </div>
          </Card>
        </TiltCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <TiltCard intensity={6}>
          <Card className="overflow-hidden border-pink/20 bg-card/80 shadow-[0_30px_120px_-40px_rgba(255,46,136,0.55)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-pink" />
                <span className="size-2 rounded-full bg-blue" />
                <span className="size-2 rounded-full bg-cyan" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                session 7QH2M9XK4C
              </span>
              <Badge variant="success">active</Badge>
            </div>

            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live score</p>
                  <p className="mt-1 font-mono text-5xl font-bold tracking-tight">
                    <Counter to={940} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mode</p>
                  <p className="mt-1 font-mono text-sm text-blue-soft">ranked</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Badge variant="default">client_source</Badge>
                <Badge variant="muted">flagged</Badge>
                <span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <IconSparkles className="size-3 text-pink" /> 47 events
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff2e88,#2e7bff)]"
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ delay: 1.1, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>0:00</span>
                <span>1:30 limit</span>
              </div>
            </div>
          </Card>
        </TiltCard>
      </motion.div>

      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(255,46,136,0.22),transparent_65%)] blur-3xl"
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
