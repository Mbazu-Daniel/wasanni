import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema/index.ts";

const POOLED_PORTS = ["6432", "6543"];

export function isPooled(url: string): boolean {
  if (url.includes("pgbouncer=true")) return true;
  if (url.includes("prepare=false")) return true;

  try {
    return POOLED_PORTS.includes(new URL(url).port);
  } catch {
    return false;
  }
}

export function createDb(
  url: string,
  opts?: { max?: number; preparedStatements?: boolean },
) {
  const sql = postgres(url, {
    max: opts?.max ?? 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: opts?.preparedStatements ?? !isPooled(url),
    onnotice: () => {},
  });

  const db = drizzle(sql, { schema });

  return { db, sql };
}

export async function pingDatabase(sql: Sql): Promise<boolean> {
  const rows = await sql<{ ok: number }[]>`select 1 as ok`;
  return rows[0]?.ok === 1;
}
