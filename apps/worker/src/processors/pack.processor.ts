import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSession, gameSessionScore } from "@wasanni/db/schema";
import {
  buildObjectKey,
  type ObjectStorage,
  type SessionEventStore,
} from "@wasanni/kit";
import type { ScorePackJob } from "@wasanni/jobs";
import type { Block } from "../types.ts";

const GRACE_MS = 60_000;
const MAX_ROWS = 1000;

const pad2 = (value: number): string => String(value).padStart(2, "0");

export function createPackProcessor(
  db: Db,
  storage: ObjectStorage,
  events: SessionEventStore,
) {
  return async function pack(job: ScorePackJob): Promise<unknown> {
    const limit = Math.min(Math.max(job.limit ?? 200, 1), MAX_ROWS);
    const cutoff = new Date(Date.now() - GRACE_MS);

    const conditions = [
      isNull(gameSessionScore.archiveKey),
      lt(gameSessionScore.submittedAt, cutoff),
      inArray(gameSession.status, ["ended", "expired"]),
    ];

    if (job.organizationId !== undefined) {
      conditions.push(eq(gameSessionScore.organizationId, job.organizationId));
    }

    const rows = await db
      .select({
        scoreId: gameSessionScore.id,
        sessionId: gameSessionScore.sessionId,
        organizationId: gameSessionScore.organizationId,
      })
      .from(gameSessionScore)
      .innerJoin(gameSession, eq(gameSessionScore.sessionId, gameSession.id))
      .where(and(...conditions))
      .orderBy(asc(gameSessionScore.submittedAt))
      .limit(limit);

    if (rows.length === 0) return { packed: 0 };

    const byOrganization = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byOrganization.get(row.organizationId) ?? [];
      list.push(row);
      byOrganization.set(row.organizationId, list);
    }

    const now = new Date();
    let packed = 0;

    for (const [organizationId, organizationRows] of byOrganization) {
      const blocks: Block[] = [];
      const chunks: Uint8Array[] = [];
      let offset = 0;

      for (const row of organizationRows) {
        const sessionEvents = await events.readAll(row.sessionId);

        if (sessionEvents.length === 0) {
          blocks.push({ scoreId: row.scoreId, offset, length: 0, rows: 0 });
          continue;
        }

        const payload = `${sessionEvents.map((event) => JSON.stringify(event)).join("\n")}\n`;
        const compressed = Bun.zstdCompressSync(new TextEncoder().encode(payload));

        chunks.push(compressed);
        blocks.push({
          scoreId: row.scoreId,
          offset,
          length: compressed.byteLength,
          rows: sessionEvents.length,
        });
        offset += compressed.byteLength;
      }

      const key = buildObjectKey({
        location: "session-events",
        organizationId,
        segments: [
          String(now.getUTCFullYear()),
          pad2(now.getUTCMonth() + 1),
          pad2(now.getUTCDate()),
        ],
        filename: `${pad2(now.getUTCHours())}-${crypto.randomUUID()}.ndjson.zst`,
      });

      await storage.putObject({
        key,
        body: Buffer.concat(chunks),
        contentType: "application/zstd",
      });

      await db.transaction(async (tx) => {
        for (const block of blocks) {
          await tx
            .update(gameSessionScore)
            .set({
              archiveKey: key,
              archiveOffset: block.offset,
              archiveLength: block.length,
              archiveRows: block.rows,
              updatedAt: new Date(),
            })
            .where(eq(gameSessionScore.id, block.scoreId));
        }
      });

      await Promise.allSettled(
        organizationRows.map((row) => events.delete(row.sessionId)),
      );

      packed += blocks.length;
    }

    return { packed };
  };
}
