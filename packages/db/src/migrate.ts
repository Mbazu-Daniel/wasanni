import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Db } from "./client.ts";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
