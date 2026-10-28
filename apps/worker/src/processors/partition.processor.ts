import { sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import type { Env, Logger } from "@wasanni/kit";

const HOUR_MS = 3_600_000;

export function createEnsurePartitionsProcessor(db: Db, env: Env, logger: Logger) {
  return async function ensure(): Promise<{ created: number }> {
    if (!env.SCORE_PARTITIONING_ENABLED) return { created: 0 };

    const start = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);

    const [row] = (await db.execute(sql`
      select ensure_hour_partitions(
        ${start}::timestamptz,
        ${env.SCORE_PARTITION_PREMAKE_HOURS}::integer
      ) as created
    `)) as { created: number }[];

    const created = Number(row?.created ?? 0);

    logger.info("partitions.ensured", {
      start: start.toISOString(),
      premakeHours: env.SCORE_PARTITION_PREMAKE_HOURS,
      created,
    });

    return { created };
  };
}
