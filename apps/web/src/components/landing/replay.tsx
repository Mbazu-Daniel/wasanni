import * as React from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRewindBackward10,
} from "@tabler/icons-react";
import { Badge } from "@/components/marketing/badge";
import { Button } from "@/components/marketing/button";
import { Card } from "@/components/marketing/card";
import { Reveal } from "@/components/motion-kit";

export function Replay() {
  const x = useMotionValue(0);
  const width = 560;
  const progress = useTransform(x, [0, width], [0, 1]);
  const score = useTransform(progress, [0, 0.4, 0.7, 1], [0, 320, 780, 940]);
  const roundedScore = useTransform(score, (value) => Math.round(value));
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!playing) return;
    const controls = setInterval(() => {
      const current = x.get();
      x.set(current >= width ? 0 : current + 8);
    }, 40);
    return () => clearInterval(controls);
  }, [playing, x]);

  return (
    <section id="replays" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <Badge variant="blue">Replays</Badge>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              The run is a file you can seek.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Events compress into one block per session. The score row keeps
              the offset and length, so a replay is a range request and one
              decompress. No scanning, no index table.
            </p>

            <div className="mt-7 space-y-3 rounded-2xl border border-border bg-card/40 p-5 font-mono text-xs">
              {[
                ["archive_key", "scores/4KD8…/14.ndjson.zst"],
                ["archive_offset", "18240"],
                ["archive_length", "912"],
                ["archive_rows", "47"],
              ].map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="truncate text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="overflow-hidden border-border/80 bg-card/60">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <Badge variant="success">replay · r2</Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  session 7QH2M9XK4C
                </span>
              </div>

              <div className="p-5">
                <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_40%_30%,rgba(255,46,136,0.14),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(46,123,255,0.14),transparent_55%)]">
                  <div className="absolute inset-0 grid-floor opacity-40" />
                  <div className="absolute left-5 top-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Score
                    </p>
                    <motion.p className="font-mono text-3xl font-bold">
                      <motion.span>{roundedScore}</motion.span>
                    </motion.p>
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-end gap-1">
                    {[
                      28, 46, 64, 38, 82, 56, 94, 44, 72, 36, 88, 52, 66, 30, 76, 48,
                    ].map((height, index) => (
                      <motion.span
                        key={index}
                        className="flex-1 rounded-sm bg-[linear-gradient(to_top,#2e7bff,#ff2e88)]"
                        initial={{ height: 0, opacity: 0.4 }}
                        whileInView={{ height: `${height}%`, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.03, duration: 0.5 }}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#ff2e88,#2e7bff)]"
                      style={{ scaleX: progress, transformOrigin: "left" }}
                    />
                  </div>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: width }}
                    dragElastic={0}
                    style={{ x }}
                    className="absolute -top-2.5 grid size-7 cursor-grab place-items-center rounded-full border-2 border-pink bg-ink shadow-[0_0_18px_rgba(255,46,136,0.7)] active:cursor-grabbing"
                  >
                    <span className="size-2 rounded-full bg-pink" />
                  </motion.div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Rewind"
                      onClick={() => x.set(0)}
                    >
                      <IconRewindBackward10 className="size-4" />
                    </Button>
                    <Button
                      variant="gradient"
                      size="icon"
                      onClick={() => setPlaying((value) => !value)}
                      aria-label={playing ? "Pause" : "Play"}
                    >
                      {playing ? (
                        <IconPlayerPause className="size-4" />
                      ) : (
                        <IconPlayerPlay className="size-4 fill-current" />
                      )}
                    </Button>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    drag the scrubber
                  </span>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
