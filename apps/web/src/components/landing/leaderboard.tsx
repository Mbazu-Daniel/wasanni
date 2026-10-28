import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconEyeOff, IconFlag, IconTrophy, IconArrowUpRight } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Counter, Reveal } from "@/components/motion-kit";

const initialRows = [
  { id: "u_552", name: "Tunde", score: 1200, flagged: false, hidden: false },
  { id: "u_118", name: "Ada", score: 980, flagged: true, hidden: false },
  { id: "u_904", name: "Kai", score: 910, flagged: false, hidden: false },
  { id: "u_671", name: "Noor", score: 870, flagged: false, hidden: false },
  { id: "u_233", name: "Ravi", score: 760, flagged: true, hidden: false },
  { id: "u_880", name: "Mina", score: 710, flagged: false, hidden: false },
];

export function Leaderboard() {
  const [rows, setRows] = React.useState(initialRows);
  const [includeFlagged, setIncludeFlagged] = React.useState(true);

  const visible = rows.filter((row) => !row.hidden && (includeFlagged || !row.flagged));
  const top = Math.max(...visible.map((row) => row.score), 1);

  return (
    <section id="leaderboards" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <Badge variant="blue">Leaderboards</Badge>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              Every score is kept. The board tells the truth about it.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A flagged score still ranks. It carries its reasons. Hiding a
              player flips the status; it never deletes the row. The board can
              include or exclude flagged entries on request.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                variant={includeFlagged ? "gradient" : "outline"}
                size="sm"
                onClick={() => setIncludeFlagged((value) => !value)}
                className="gap-2"
              >
                <IconFlag className="size-4" />
                {includeFlagged ? "Flagged rows shown" : "Flagged rows hidden"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((current) =>
                    current.map((row) =>
                      row.id === "u_118" ? { ...row, hidden: !row.hidden } : row,
                    ),
                  )
                }
                className="gap-2"
              >
                <IconEyeOff className="size-4" />
                Toggle Ada's visibility
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <IconTrophy className="size-4 text-pink" />
                <Counter to={visible.length} /> ranked players
              </span>
              <span className="flex items-center gap-2">
                <IconArrowUpRight className="size-4 text-blue-soft" />
                one row per player
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="overflow-hidden border-border/80 bg-card/60">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Neon Racer · ArcadeHub · ranked
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">Pixel Cup · Spring</p>
                </div>
                <Badge variant="default">live</Badge>
              </div>

              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {visible.map((row, index) => (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="relative flex items-center gap-4 px-5 py-4"
                    >
                      <span
                        className={
                          index === 0
                            ? "grid size-7 place-items-center rounded-full bg-pink/15 font-mono text-xs font-bold text-pink"
                            : "grid size-7 place-items-center rounded-full bg-white/[0.04] font-mono text-xs text-muted-foreground"
                        }
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          {row.flagged && <IconFlag className="size-3.5 text-pink" />}
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                          <motion.div
                            className={
                              row.flagged
                                ? "h-full rounded-full bg-[linear-gradient(90deg,#ff2e88,#ff7ab6)]"
                                : "h-full rounded-full bg-[linear-gradient(90deg,#2e7bff,#22d3ee)]"
                            }
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.score / top) * 100}%` }}
                            transition={{
                              duration: 0.9,
                              delay: index * 0.05,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-sm tabular-nums">{row.score}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
                <span className="font-mono">cursor: score, submitted_at, id</span>
                <span>1 / 12</span>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
