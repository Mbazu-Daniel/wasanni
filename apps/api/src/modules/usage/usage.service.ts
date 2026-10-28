import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { usageCounter, usageQuota } from "@wasanni/db/schema";
import type { UsageMetric, UsagePeriod } from "@wasanni/contracts";
import { RateLimitedError } from "@wasanni/kit";
import type { UsageServiceDeps } from "./types.ts";

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

  return {
    incr,

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
      const rows = await db.execute(sql`
        select coalesce(sum(size_bytes), 0)::bigint as total
        from (
          select size_bytes from game_file
          where organization_id = ${organizationId} and status = 'ready'
          union all
          select size_bytes from template
          where organization_id = ${organizationId} and status = 'ready'
        ) as files
      `);

      return Number((rows as unknown as { total: string }[])[0]?.total ?? 0);
    },
  };
}
