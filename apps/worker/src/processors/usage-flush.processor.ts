import { sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { usageCounter } from "@wasanni/db/schema";
import type { Redis } from "@wasanni/kit";

const PREFIX = "usage:live:bandwidth:";

export function createUsageFlushProcessor(db: Db, redis: Redis) {
  const countBandwidth = async (
    organizationId: string,
    period: Date,
    amount: number,
  ): Promise<boolean> => {
    try {
      await db
        .insert(usageCounter)
        .values({
          organizationId,
          platformId: null,
          periodStart: period,
          metric: "bandwidth_bytes",
          value: amount,
        })
        .onConflictDoUpdate({
          target: [
            usageCounter.organizationId,
            usageCounter.platformId,
            usageCounter.periodStart,
            usageCounter.metric,
          ],
          set: {
            value: sql`${usageCounter.value} + ${amount}`,
            updatedAt: new Date(),
          },
        });

      return true;
    } catch {
      return false;
    }
  };

  return async function flush(): Promise<{ keys: number; bytes: number }> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const [next, batch] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 200);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");

    let flushed = 0;
    let bytes = 0;

    for (const key of keys) {
      const raw = await redis.getdel(key).catch(() => null);
      if (raw === null) continue;

      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const rest = key.slice(PREFIX.length);
      const separator = rest.indexOf(":");
      if (separator === -1) continue;

      const organizationId = rest.slice(0, separator);
      const period = new Date(rest.slice(separator + 1));
      if (Number.isNaN(period.getTime())) continue;

      if (!(await countBandwidth(organizationId, period, amount))) continue;

      flushed += 1;
      bytes += amount;
    }

    return { keys: flushed, bytes };
  };
}
