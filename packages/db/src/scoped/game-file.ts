import { eq } from "drizzle-orm";
import type { Scope } from "@wasanni/kit";
import { gameFile } from "../schema/index.ts";
import type { DbExecutor } from "../types.ts";
import { scopeTo } from "./scoped.ts";

const scopeOf = (organizationId: string): Scope => ({ scoped: true, organizationId });

export const demoteCurrentGameFile = async (
  executor: DbExecutor,
  organizationId: string,
  gameId: string,
): Promise<void> => {
  await executor
    .update(gameFile)
    .set({ isCurrent: false })
    .where(
      scopeTo(
        scopeOf(organizationId),
        gameFile,
        eq(gameFile.gameId, gameId),
        eq(gameFile.isCurrent, true),
      ),
    );
};

export const markFileCurrent = async (
  executor: DbExecutor,
  input: {
    organizationId: string;
    gameId: string;
    fileId: string;
    promote: Partial<typeof gameFile.$inferInsert>;
  },
): Promise<void> => {
  await demoteCurrentGameFile(executor, input.organizationId, input.gameId);

  await executor
    .update(gameFile)
    .set({ ...input.promote, isCurrent: true })
    .where(scopeTo(scopeOf(input.organizationId), gameFile, eq(gameFile.id, input.fileId)));
};
