import { createDb } from "@wasanni/db";
import { webhookConfig } from "@wasanni/db/schema";
import { decryptSecret, encryptSecret, readEnv } from "@wasanni/kit";
import { eq } from "drizzle-orm";

const [, , oldKey, newKey] = Bun.argv;

if (oldKey === undefined || newKey === undefined || newKey.length < 32) {
  console.error("usage: bun scripts/rotate-secret.ts <old-key> <new-key>");
  process.exit(1);
}

const { db, sql } = createDb(readEnv().DATABASE_URL, { max: 1 });

let rotated = 0;

try {
  for (const row of await db.select().from(webhookConfig)) {
    const plaintext = decryptSecret(row.secretCiphertext, oldKey);

    await db
      .update(webhookConfig)
      .set({ secretCiphertext: encryptSecret(plaintext, newKey) })
      .where(eq(webhookConfig.id, row.id));

    rotated += 1;
  }

  console.log(`rotated ${rotated} webhook secrets`);
} finally {
  await sql.end({ timeout: 5 });
}
