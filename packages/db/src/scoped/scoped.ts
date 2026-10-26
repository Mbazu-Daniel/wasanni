import { and, eq, type SQL } from "drizzle-orm";
import type { Scope } from "@wasanni/kit";
import type { WorkspaceScoped } from "./types.ts";

export function scopeTo<T extends WorkspaceScoped>(
  scope: Scope,
  table: T,
  ...filters: (SQL | undefined)[]
): SQL {
  const predicate = and(eq(table.workspaceId, scope.workspaceId), ...filters);

  if (predicate === undefined) {
    throw new Error("workspace scope predicate is empty");
  }

  return predicate;
}
