import type { Db, DbExecutor } from "@wasanni/db";
import { outboxEvent } from "@wasanni/db/schema";
import type { WebhookDispatchInput, WebhookDispatcher } from "./types.ts";

const writeOutbox = async (
  executor: DbExecutor,
  input: WebhookDispatchInput,
): Promise<void> => {
  await executor.insert(outboxEvent).values({
    organizationId: input.organizationId,
    platformId: input.platformId,
    eventType: input.eventType,
    payload: input.payload,
    status: "pending",
  });
};

export function createWebhookDispatcher(db: Db): WebhookDispatcher {
  return {
    async dispatch(input, executor?: DbExecutor) {
      if (executor !== undefined) {
        await writeOutbox(executor, input);
        return;
      }

      await db.transaction((tx) => writeOutbox(tx, input));
    },
  };
}
