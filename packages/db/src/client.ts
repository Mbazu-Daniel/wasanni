import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema/index.ts";

export function createDb(url: string, opts?: { max?: number }) {
  const sql = postgres(url, {
    max: opts?.max ?? 10,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });

  const db = drizzle(sql, { schema });

  return { db, sql };
}

export async function pingDatabase(sql: Sql): Promise<boolean> {
  const rows = await sql<{ ok: number }[]>`select 1 as ok`;
  return rows[0]?.ok === 1;
}
