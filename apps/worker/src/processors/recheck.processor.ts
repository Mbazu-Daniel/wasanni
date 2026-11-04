import { and, eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameConfig, gameSession, gameSessionScore } from "@wasanni/db/schema";
import { isFlagged, readRuleFlags, SCORE_CONFIG_FLAGS } from "@wasanni/kit";
import type { ScoreRecheckJob } from "@wasanni/jobs";

const MAX_ROWS = 5000;

export function createRecheckProcessor(db: Db) {
  return async function recheck(job: ScoreRecheckJob): Promise<unknown> {
    const [config] = await db
      .select({ id: gameConfig.id, config: gameConfig.config })
      .from(gameConfig)
      .where(
        and(
          eq(gameConfig.id, job.configId),
          eq(gameConfig.organizationId, job.organizationId),
        ),
      )
      .limit(1);

    if (config === undefined) return { skipped: "config-missing" };

    const rows = await db
      .select({
        scoreId: gameSessionScore.id,
        score: gameSessionScore.score,
        flags: gameSessionScore.flags,
        submittedAt: gameSessionScore.submittedAt,
        startedAt: gameSession.startedAt,
      })
      .from(gameSessionScore)
      .innerJoin(gameSession, eq(gameSessionScore.sessionId, gameSession.id))
      .where(
        and(
          eq(gameSessionScore.organizationId, job.organizationId),
          eq(gameSession.gameConfigId, job.configId),
        ),
      )
      .limit(MAX_ROWS);

    let updated = 0;

    for (const row of rows) {
      const durationSeconds = Math.max(
        0,
        (row.submittedAt.getTime() - row.startedAt.getTime()) / 1000,
      );

      const configFlags = readRuleFlags(config.config, row.score, durationSeconds);
      const keptFlags = row.flags.filter((flag) => !SCORE_CONFIG_FLAGS.includes(flag));
      const merged = [...new Set([...keptFlags, ...configFlags])];

      const unchanged =
        merged.length === row.flags.length &&
        merged.every((flag) => row.flags.includes(flag));

      if (unchanged) continue;

      await db
        .update(gameSessionScore)
        .set({
          flags: merged,
          flagged: isFlagged(merged),
          updatedAt: new Date(),
        })
        .where(eq(gameSessionScore.id, row.scoreId));

      updated += 1;
    }

    return { updated };
  };
}
