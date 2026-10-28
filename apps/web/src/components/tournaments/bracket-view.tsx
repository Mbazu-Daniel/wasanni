import { motion } from "motion/react";
import { IconTrophy, IconCrown, IconUserQuestion } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/primitives/status-pill";
import type { BracketMatch, BracketView as BracketData } from "@/lib/tournament-types";

export function BracketView({
  bracket,
  onCompleteMatch,
}: {
  bracket: BracketData;
  onCompleteMatch: (match: BracketMatch) => void;
}) {
  if (bracket.rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          The bracket has not been generated yet.
        </p>
      </div>
    );
  }

  const totalRounds = bracket.rounds[bracket.rounds.length - 1]?.round ?? 0;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-5">
        {bracket.rounds.map((round) => {
          const isFinal = round.round === totalRounds;

          return (
            <div key={round.round} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {isFinal ? "Final" : `Round ${round.round}`}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {round.matches.filter((match) => match.status === "completed").length}/
                  {round.matches.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    isFinal={isFinal}
                    onComplete={() => onCompleteMatch(match)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  isFinal,
  onComplete,
}: {
  match: BracketMatch;
  isFinal: boolean;
  onComplete: () => void;
}) {
  const home = match.participants.find((participant) => participant.slot === 0);
  const away = match.participants.find((participant) => participant.slot === 1);

  const homeWon = match.winnerParticipantId !== null && home?.id === match.winnerParticipantId;
  const awayWon = match.winnerParticipantId !== null && away?.id === match.winnerParticipantId;

  const canComplete =
    match.status === "active" && match.participants.length >= 2 && match.winnerParticipantId === null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative w-64 rounded-xl border-2 p-3 transition-colors",
        isFinal && match.winnerParticipantId !== null
          ? "border-pink/50 bg-[linear-gradient(160deg,rgba(255,46,136,0.10),rgba(46,123,255,0.06))] shadow-[0_0_40px_-16px_rgba(255,46,136,0.7)]"
          : "border-border bg-card/60",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">
          M{match.bracketSlot + 1}
        </span>
        <StatusPill status={match.status} />
      </div>

      <div className="space-y-1">
        <BracketSlot
          name={home?.displayName ?? home?.externalUserId}
          score={home?.score ?? null}
          won={homeWon}
          isFinal={isFinal}
        />
        <BracketSlot
          name={away?.displayName ?? away?.externalUserId}
          score={away?.score ?? null}
          won={awayWon}
          isFinal={isFinal}
        />
      </div>

      {canComplete && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={onComplete}
          >
            Declare winner
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function BracketSlot({
  name,
  score,
  won,
  isFinal,
}: {
  name: string | undefined;
  score: number | null;
  won: boolean;
  isFinal: boolean;
}) {
  if (name === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-2 py-1.5">
        <IconUserQuestion className="size-3 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground/60">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
        won ? (isFinal ? "bg-pink/10" : "bg-emerald-400/10") : "bg-transparent",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {won &&
          (isFinal ? (
            <IconCrown className="size-3 shrink-0 text-pink" />
          ) : (
            <IconTrophy className="size-3 shrink-0 text-emerald-400" />
          ))}
        <span
          className={cn(
            "truncate text-xs",
            won ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {name}
        </span>
      </div>
      {score !== null && (
        <span
          className={cn(
            "shrink-0 font-mono text-xs tabular-nums",
            won ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
