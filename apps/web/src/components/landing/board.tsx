import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconEyeOff, IconEye, IconFlag } from "@tabler/icons-react";
import { Reveal } from "@/components/motion-kit";

const initialRows = [
  { id: "u_552", name: "Tunde", score: 1200, flagged: false, hidden: false },
  { id: "u_118", name: "Ada", score: 980, flagged: true, hidden: false },
  { id: "u_904", name: "Kai", score: 910, flagged: false, hidden: false },
  { id: "u_671", name: "Noor", score: 870, flagged: false, hidden: false },
  { id: "u_233", name: "Ravi", score: 760, flagged: true, hidden: false },
  { id: "u_880", name: "Mina", score: 710, flagged: false, hidden: false },
];

export function Board() {
  const [rows, setRows] = React.useState(initialRows);
  const [includeFlagged, setIncludeFlagged] = React.useState(false);
  const reduce = useReducedMotion();

  const ada = rows.find((row) => row.id === "u_118");
  const visible = rows.filter((row) => !row.hidden && (includeFlagged || !row.flagged));
  const top = Math.max(...visible.map((row) => row.score), 1);

  return (
    <section id="board" className="scroll-mt-20 border-b border-mist/15">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <Reveal>
          <h2 className="font-poster text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-chalk sm:text-5xl">
            Ship fair play. <span className="text-signal">Keep the proof.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-chalk/85">
            Your game gets the competition layer without losing its audit trail.
            Flagged scores stay reviewable, hidden players leave the board without
            losing their records, and every decision remains visible to your team.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => setIncludeFlagged((value) => !value)}
              aria-pressed={includeFlagged}
              className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
                includeFlagged
                  ? "bg-signal text-night"
                  : "border border-chalk/40 text-chalk hover:border-signal hover:bg-signal/10"
              }`}
            >
              <IconFlag className="size-4" />
              {includeFlagged ? "Flagged scores shown" : "Flagged scores hidden"}
            </button>
            <button
              onClick={() =>
                setRows((current) =>
                  current.map((row) =>
                    row.id === "u_118" ? { ...row, hidden: !row.hidden } : row,
                  ),
                )
              }
              aria-pressed={ada?.hidden ?? false}
              className="flex items-center gap-2 rounded-full border border-chalk/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-chalk transition-colors hover:border-signal hover:bg-signal/10"
            >
              {ada?.hidden ? <IconEye className="size-4" /> : <IconEyeOff className="size-4" />}
              {ada?.hidden ? "Show Ada's scores" : "Hide Ada's scores"}
            </button>
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-mist">
            Demo data — these players are not real
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-mist/15 bg-night/40 px-5 py-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist">
                  Drift Kings · Pixel Cup · Leaderboard format
                </p>
                <p className="mt-1 font-poster text-2xl font-black uppercase text-chalk">
                  Standings
                </p>
              </div>
              <span className="rounded-full bg-signal px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-night">
                Open
              </span>
            </div>

            <div className="divide-y divide-mist/12">
              <AnimatePresence initial={false}>
                {visible.map((row, index) => (
                  <motion.div
                    key={row.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <span
                      className={`grid size-8 place-items-center rounded-lg font-poster text-sm font-black ${
                        index === 0
                          ? "bg-signal text-night"
                          : "border border-mist/25 bg-night/50 text-chalk"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-chalk">
                          {row.name}
                        </p>
                        {row.flagged && (
                          <span className="rounded-full border border-mist/40 px-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mist">
                            flagged
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-night/50">
                        <motion.div
                          className={`h-full rounded-full ${
                            row.flagged ? "bg-mist/70" : "bg-signal"
                          }`}
                          initial={reduce ? false : { width: 0 }}
                          animate={{ width: `${(row.score / top) * 100}%` }}
                          transition={{
                            duration: 0.9,
                            delay: index * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums text-chalk">
                      {row.score}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between border-t border-mist/15 bg-night/40 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-mist">
              <span>Best score per player</span>
              <span>{visible.length} players shown</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
