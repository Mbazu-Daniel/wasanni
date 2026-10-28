import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { usageCounter, usageQuota } from "@wasanni/db/schema";
import type { UsageMetric, UsagePeriod } from "@wasanni/contracts";
import { RateLimitedError } from "@wasanni/kit";
import { DAILY_SOURCES } from "./constants.ts";
import type { DailyMetric, DailyRow, UsageServiceDeps } from "./types.ts";

export const currentPeriodStart = (now = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const periodEnd = (start: Date): Date =>
  new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

export function createUsageService(db: Db, deps: UsageServiceDeps) {
  const { logger, enabled } = deps;

  const incr = async (input: {
    organizationId: string;
    platformId: string | null;
    metric: UsageMetric;
    amount?: number;
  }): Promise<void> => {
    if (!enabled) return;

    const amount = input.amount ?? 1;

    try {
      await db
        .insert(usageCounter)
        .values({
          organizationId: input.organizationId,
          platformId: input.platformId,
          periodStart: currentPeriodStart(),
          metric: input.metric,
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
    } catch (error) {
      logger.warn("usage.write_failed", {
        metric: input.metric,
        organizationId: input.organizationId,
        err: error,
      });
    }
  };

  const total = async (input: {
    organizationId: string;
    metric: UsageMetric;
    period?: Date;
  }): Promise<number> => {
    const rows = await db
      .select({ value: sql<number>`coalesce(sum(${usageCounter.value}), 0)::bigint` })
      .from(usageCounter)
      .where(
        and(
          eq(usageCounter.organizationId, input.organizationId),
          eq(usageCounter.metric, input.metric),
          eq(usageCounter.periodStart, input.period ?? currentPeriodStart()),
        ),
      );

    return Number(rows[0]?.value ?? 0);
  };

  const checkQuota = async (input: {
    organizationId: string;
    metric: UsageMetric;
    amount?: number;
  }): Promise<void> => {
    if (!enabled) return;

    const [row] = await db
      .select({
        limit: usageQuota.limitValue,
        current: sql<number>`coalesce(sum(${usageCounter.value}), 0)::bigint`,
      })
      .from(usageQuota)
      .leftJoin(
        usageCounter,
        and(
          eq(usageCounter.organizationId, usageQuota.organizationId),
          eq(usageCounter.metric, usageQuota.metric),
          eq(usageCounter.periodStart, currentPeriodStart()),
        ),
      )
      .where(
        and(
          eq(usageQuota.organizationId, input.organizationId),
          eq(usageQuota.metric, input.metric),
          eq(usageQuota.period, "monthly"),
        ),
      )
      .groupBy(usageQuota.limitValue)
      .limit(1);

    if (row === undefined) return;

    const current = Number(row.current);
    const limit = Number(row.limit);

    if (current + (input.amount ?? 1) > limit) {
      throw new RateLimitedError(
        `the monthly quota for ${input.metric} is reached (${current}/${limit})`,
        { details: { metric: input.metric, current, limit } },
      );
    }
  };

  const dailyBreakdown = async (input: {
    organizationId: string;
    metric: DailyMetric;
    from: Date;
    to: Date;
    platformId?: string;
    gameId?: string;
  }): Promise<DailyRow[]> => {
    const source = DAILY_SOURCES[input.metric];

    const column = sql.raw(source.column);
    const where = and(
      sql`organization_id = ${input.organizationId}`,
      sql`${column} >= ${input.from.toISOString()}::timestamptz`,
      sql`${column} <= ${input.to.toISOString()}::timestamptz`,
      input.gameId === undefined
        ? undefined
        : sql`${sql.raw(source.gameColumn)} = ${input.gameId}`,
      input.platformId === undefined
        ? undefined
        : source.platformFilter(input.platformId),
    );

    const rows = (await db.execute(sql`
      select
        to_char(date_trunc('day', ${column}), 'YYYY-MM-DD') as day,
        count(*)::int as value
      from ${sql.raw(source.table)}
      where ${where}
      group by day
      order by day
    `)) as { day: string; value: number }[];

    const byDate = new Map(rows.map((row) => [row.day, Number(row.value)]));

    const series: DailyRow[] = [];
    const cursor = new Date(input.from);
    cursor.setUTCHours(0, 0, 0, 0);

    while (cursor <= input.to) {
      const date = cursor.toISOString().slice(0, 10);
      series.push({ date, value: byDate.get(date) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return series;
  };

  const storageBreakdown = async (organizationId: string) => {
    const games = await db.execute<{
      id: string;
      name: string;
      slug: string;
      size_bytes: string | number;
      file_count: number;
    }>(sql`
      select
        g.id,
        g.name,
        g.slug,
        coalesce(sum(gf.size_bytes), 0)::bigint as size_bytes,
        count(gf.id)::int as file_count
      from game g
      left join game_file gf
        on gf.game_id = g.id
        and gf.status = 'ready'
        and gf.is_current = true
      where g.organization_id = ${organizationId}
      group by g.id, g.name, g.slug
      having coalesce(sum(gf.size_bytes), 0) > 0
      order by size_bytes desc
    `);

    const templates = (await db.execute(sql`
      select t.id, t.name, t.slug, coalesce(t.size_bytes, 0)::bigint as size_bytes
      from template t
      where t.organization_id = ${organizationId}
        and t.status = 'ready'
        and t.size_bytes is not null
        and t.size_bytes > 0
      order by t.size_bytes desc
    `)) as { id: string; name: string; slug: string; size_bytes: string | number }[];

    const totalGames = games.reduce((sum, row) => sum + Number(row.size_bytes), 0);
    const totalTemplates = templates.reduce(
      (sum, row) => sum + Number(row.size_bytes),
      0,
    );

    return {
      games: games.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sizeBytes: Number(row.size_bytes),
        fileCount: Number(row.file_count),
      })),
      templates: templates.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sizeBytes: Number(row.size_bytes),
      })),
      totalGames,
      totalTemplates,
      total: totalGames + totalTemplates,
    };
  };

  return {
    incr,

    dailyBreakdown,

    storageBreakdown,

    total,

    checkQuota,

    async read(input: {
      organizationId: string;
      platformId: string | null;
      metric: UsageMetric;
      period?: Date;
    }): Promise<number> {
      const [row] = await db
        .select({ value: usageCounter.value })
        .from(usageCounter)
        .where(
          and(
            eq(usageCounter.organizationId, input.organizationId),
            input.platformId === null
              ? sql`${usageCounter.platformId} is null`
              : eq(usageCounter.platformId, input.platformId),
            eq(usageCounter.metric, input.metric),
            eq(usageCounter.periodStart, input.period ?? currentPeriodStart()),
          ),
        )
        .limit(1);

      return Number(row?.value ?? 0);
    },

    async listForPeriod(
      organizationId: string,
      periodStart: Date,
    ): Promise<{ platformId: string | null; metric: UsageMetric; value: number }[]> {
      const rows = await db
        .select({
          platformId: usageCounter.platformId,
          metric: usageCounter.metric,
          value: usageCounter.value,
        })
        .from(usageCounter)
        .where(
          and(
            eq(usageCounter.organizationId, organizationId),
            eq(usageCounter.periodStart, periodStart),
          ),
        )
        .orderBy(usageCounter.metric);

      return rows.map((row) => ({
        platformId: row.platformId,
        metric: row.metric,
        value: Number(row.value),
      }));
    },

    async listQuotas(organizationId: string): Promise<
      { id: string; metric: UsageMetric; period: UsagePeriod; limitValue: number }[]
    > {
      const rows = await db
        .select({
          id: usageQuota.id,
          metric: usageQuota.metric,
          period: usageQuota.period,
          limitValue: usageQuota.limitValue,
        })
        .from(usageQuota)
        .where(eq(usageQuota.organizationId, organizationId));

      return rows.map((row) => ({
        id: row.id,
        metric: row.metric,
        period: row.period,
        limitValue: Number(row.limitValue),
      }));
    },

    async setQuota(input: {
      organizationId: string;
      metric: UsageMetric;
      period?: UsagePeriod;
      limitValue: number;
    }): Promise<void> {
      await db
        .insert(usageQuota)
        .values({
          organizationId: input.organizationId,
          metric: input.metric,
          period: input.period ?? "monthly",
          limitValue: input.limitValue,
        })
        .onConflictDoUpdate({
          target: [usageQuota.organizationId, usageQuota.metric, usageQuota.period],
          set: { limitValue: input.limitValue, updatedAt: new Date() },
        });
    },

    async removeQuota(organizationId: string, metric: UsageMetric): Promise<void> {
      await db
        .delete(usageQuota)
        .where(
          and(
            eq(usageQuota.organizationId, organizationId),
            eq(usageQuota.metric, metric),
          ),
        );
    },

    async storageBytes(organizationId: string): Promise<number> {
      const rows = await db.execute<{ total: string }>(sql`
        select coalesce(sum(size_bytes), 0)::bigint as total
        from (
          select size_bytes from game_file
          where organization_id = ${organizationId} and status = 'ready'
          union all
          select size_bytes from template
          where organization_id = ${organizationId} and status = 'ready'
        ) as files
      `);

      return Number(rows[0]?.total ?? 0);
    },
  };
}
