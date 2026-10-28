import { createDb } from "./client.ts";
import { runMigrations } from "./migrate.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const { db, sql } = createDb(url, { max: 1 });

await runMigrations(db);
console.log("✓ migrations applied");
await sql.end({ timeout: 5 });
