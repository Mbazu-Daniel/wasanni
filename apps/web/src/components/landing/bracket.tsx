import * as React from "react";
import { motion } from "motion/react";
import { IconTrophy, IconSwords, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/marketing/badge";
import { Button } from "@/components/marketing/button";
import { Reveal } from "@/components/motion-kit";

type Player = { id: string; name: string; score: number };
type Match = [Player, Player];

const roundOne: Match[] = [
  [
    { id: "p1", name: "Tunde", score: 1200 },
    { id: "p8", name: "Ravi", score: 760 },
  ],
  [
    { id: "p4", name: "Ada", score: 980 },
    { id: "p5", name: "Mina", score: 710 },
  ],
  [
    { id: "p2", name: "Kai", score: 910 },
    { id: "p7", name: "Noor", score: 870 },
  ],
  [
    { id: "p3", name: "Zuri", score: 890 },
    { id: "p6", name: "Leo", score: 840 },
  ],
];

const winners = (matches: Match[]): Player[] =>
  matches.map(([a, b]) => (a.score >= b.score ? a : b));

export function Bracket() {
  const [round, setRound] = React.useState(0);

  const winnersOne = winners(roundOne);
  const winnersTwo = winners([
    [winnersOne[0]!, winnersOne[1]!],
    [winnersOne[2]!, winnersOne[3]!],
  ]);

  const columns: Match[][] = [
    roundOne,
    [
      [winnersOne[0]!, winnersOne[1]!],
      [winnersOne[2]!, winnersOne[3]!],
    ],
    [[winnersTwo[0]!, winnersTwo[1]!]],
  ];

  const champion = winnersTwo[0];

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(46,123,255,0.12),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge>Bracket tournaments</Badge>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            The bracket advances itself.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Winners are seated in the next round by a conditional update, not by
            a queue job. Completing the same match twice cannot duplicate a
            slot.
          </p>
        </Reveal>

        <div className="mt-12 overflow-x-auto pb-4">
          <div className="mx-auto grid min-w-[760px] grid-cols-3 gap-6">
            {columns.map((matches, columnIndex) => (
              <div key={columnIndex} className="flex flex-col justify-around gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Round {columnIndex + 1}
                  </span>
                  <Badge variant={columnIndex === 2 ? "default" : "muted"}>
                    {columnIndex === 2 ? "final" : "best of 1"}
                  </Badge>
                </div>

                {matches.map(([a, b], matchIndex) => {
                  const winner = a.score >= b.score ? a : b;
                  const isChampion = columnIndex === 2 && champion?.id === winner.id;

                  return (
                    <motion.div
                      key={`${columnIndex}-${matchIndex}`}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        delay: columnIndex * 0.08 + matchIndex * 0.04,
                      }}
                      className={
                        isChampion
                          ? "rounded-2xl border border-pink/40 bg-[linear-gradient(160deg,rgba(255,46,136,0.14),rgba(46,123,255,0.10))] p-3 shadow-[0_0_50px_-16px_rgba(255,46,136,0.8)]"
                          : "rounded-2xl border border-border bg-card/50 p-3"
                      }
                    >
                      {[a, b].map((player) => (
                        <div
                          key={player.id}
                          className={
                            player.id === winner.id
                              ? "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-semibold text-foreground"
                              : "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted-foreground"
                          }
                        >
                          <span className="flex items-center gap-2">
                            {player.id === winner.id && (
                              <IconTrophy className="size-3.5 text-pink" />
                            )}
                            {player.name}
                          </span>
                          <span className="font-mono text-xs tabular-nums">{player.score}</span>
                        </div>
                      ))}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setRound((value) => (value + 1) % 3)}
          >
            <IconRefresh className="size-4" />
            Replay the advance
          </Button>
          <Button variant="gradient" size="sm" className="gap-2" onClick={() => setRound(0)}>
            <IconSwords className="size-4" />
            Back to round one
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            state: round {round + 1}
          </span>
        </div>
      </div>
    </section>
  );
}
