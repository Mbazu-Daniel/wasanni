import { eq, isNull } from "drizzle-orm";
import type { Scope } from "@wasanni/kit";
import { gameFile } from "../schema/index.ts";
import type { DbExecutor } from "../types.ts";
import { scopeTo } from "./scoped.ts";

const scopeOf = (organizationId: string): Scope => ({ scoped: true, organizationId });

export const demoteCurrentGameFile = async (
  executor: DbExecutor,
  organizationId: string,
  gameId: string,
  platformId: string | null,
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
        platformId === null ? isNull(gameFile.platformId) : eq(gameFile.platformId, platformId),
      ),
    );
};

export const markFileCurrent = async (
  executor: DbExecutor,
  input: {
    organizationId: string;
    gameId: string;
    fileId: string;
    platformId: string | null;
    promote: Partial<typeof gameFile.$inferInsert>;
  },
): Promise<void> => {
  await demoteCurrentGameFile(executor, input.organizationId, input.gameId, input.platformId);

  await executor
    .update(gameFile)
    .set({ ...input.promote, isCurrent: true })
    .where(scopeTo(scopeOf(input.organizationId), gameFile, eq(gameFile.id, input.fileId)));
};
