import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

export type CursorKey = { createdAt: Date; id: string };

export const encodeCursor = (row: CursorKey): string =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, "utf8").toString("base64url");

export const decodeCursor = (cursor: string): CursorKey | null => {
  const [createdAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");

  if (createdAt === undefined || id === undefined) return null;

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return { createdAt: parsed, id };
};

export const afterCursor = (
  createdAt: SQLWrapper,
  id: SQLWrapper,
  cursor: CursorKey,
): SQL =>
  sql`(date_trunc('milliseconds', ${createdAt}), ${id}) < (date_trunc('milliseconds', ${cursor.createdAt.toISOString()}::timestamptz), ${cursor.id}::uuid)`;

export const paginate = <T extends CursorKey>(rows: T[], limit: number) => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);

  return {
    items,
    page: {
      limit,
      hasMore,
      cursor: hasMore && last !== undefined ? encodeCursor(last) : null,
    },
  };
};
