import { sql } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import type { Env, Logger, ObjectStorage } from "@wasanni/kit";
import type { AuditService } from "../../../api/src/modules/audit/types.ts";
import type { ScoreArchivePartition, ScoreArchiveRow } from "../types.ts";

const HOUR_MS = 3_600_000;

export type ArchivePartitionsDeps = {
  db: Db;
  storage: ObjectStorage;
  audit: AuditService;
  env: Env;
  logger: Logger;
};

const pad = (value: number): string => String(value).padStart(2, "0");

const hourKey = (date: Date): string =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}`;

const hourPath = (date: Date): string =>
  `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${pad(date.getUTCHours())}`;

const partitionHour = (name: string): Date => {
  const slot = name.slice(-10);

  return new Date(
    Date.UTC(
      Number(slot.slice(0, 4)),
      Number(slot.slice(4, 6)) - 1,
      Number(slot.slice(6, 8)),
      Number(slot.slice(8, 10)),
    ),
  );
};

export function createArchivePartitionsProcessor(deps: ArchivePartitionsDeps) {
  const { db, storage, audit, env, logger } = deps;

  const exportScores = async (
    organizationId: string,
    rows: ScoreArchiveRow[],
    path: string,
  ): Promise<string> => {
    const body = rows
      .map((row) => JSON.stringify({
        id: row.id,
        sessionId: row.session_id,
        platformId: row.platform_id,
        gameId: row.game_id,
        organizationId: row.organization_id,
        externalUserId: row.external_user_id,
        mode: row.mode,
        score: Number(row.score),
        status: row.status,
        flagged: row.flagged,
        flags: row.flags,
        source: row.source,
        archiveKey: row.archive_key,
        archiveOffset: row.archive_offset === null ? null : Number(row.archive_offset),
        archiveLength: row.archive_length === null ? null : Number(row.archive_length),
        archiveRows: row.archive_rows,
        submittedAt: new Date(row.submitted_at).toISOString(),
      }))
      .join("\n")
      .concat("\n");

    const key = `score-archive/${organizationId}/${path}.ndjson.zst`;

    await storage.putObject({
      key,
      body: Bun.zstdCompressSync(new TextEncoder().encode(body)),
      contentType: "application/zstd",
    });

    return key;
  };

  return async function archive(): Promise<{ archived: number; dropped: number }> {
    if (!env.SCORE_PARTITIONING_ENABLED || !env.SCORE_ARCHIVE_ENABLED) {
      return { archived: 0, dropped: 0 };
    }

    const cutoff = new Date(
      Date.now() - env.SCORE_ARCHIVE_RETENTION_HOURS * HOUR_MS - HOUR_MS,
    );

    const partitions = (await db.execute(sql`
      select c.relname as name
      from pg_inherits i
      join pg_class c on c.oid = i.inhrelid
      join pg_class p on p.oid = i.inhparent
      where p.relname = 'game_session_score'
        and c.relname ~ '^game_session_score_h[0-9]{10}$'
        and substr(c.relname, 21) <= ${hourKey(cutoff)}
      order by c.relname
      limit ${env.SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN}
    `)) as ScoreArchivePartition[];

    let archived = 0;
    let dropped = 0;

    for (const partition of partitions) {
      const path = hourPath(new Date(partitionHour(partition.name).getTime() + HOUR_MS));

      const rows = (await db.execute(sql`
        select * from ${sql.identifier(partition.name)}
        order by organization_id, external_user_id
      `)) as ScoreArchiveRow[];

      const byOrganization = new Map<string, ScoreArchiveRow[]>();

      for (const row of rows) {
        const list = byOrganization.get(row.organization_id) ?? [];
        list.push(row);
        byOrganization.set(row.organization_id, list);
      }

      const exports: { organizationId: string; rows: number; key: string }[] = [];

      for (const [organizationId, organizationRows] of byOrganization) {
        const key = await exportScores(organizationId, organizationRows, path);

        exports.push({ organizationId, rows: organizationRows.length, key });

        logger.info("archive.partition.org", {
          partition: partition.name,
          organizationId,
          rows: organizationRows.length,
          key,
        });
      }

      archived += rows.length;

      if (env.SCORE_ARCHIVE_DRY_RUN) {
        logger.info("archive.partition.dry_run", {
          partition: partition.name,
          rows: rows.length,
          wouldDrop: true,
        });
        continue;
      }

      await db.execute(sql`drop table ${sql.identifier(partition.name)}`);

      dropped += 1;

      for (const entry of exports) {
        await audit.record({
          organizationId: entry.organizationId,
          actor: { type: "system" },
          source: "worker",
          action: "score.archive",
          resourceType: "score_partition",
          resourceId: partition.name,
          metadata: { path, rows: entry.rows, key: entry.key },
        });
      }

      logger.info("archive.partition.dropped", {
        partition: partition.name,
        rows: rows.length,
      });
    }

    return { archived, dropped };
  };
}
