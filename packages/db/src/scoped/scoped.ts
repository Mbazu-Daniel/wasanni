import { and, eq, type SQL } from "drizzle-orm";
import type { Scope } from "@wasanni/kit";
import type { OrganizationScoped } from "./types.ts";

export function scopeTo<T extends OrganizationScoped>(
  scope: Scope,
  table: T,
  ...filters: (SQL | undefined)[]
): SQL {
  const predicate = and(eq(table.organizationId, scope.organizationId), ...filters);

  if (predicate === undefined) {
    throw new Error("organization scope predicate is empty");
  }

  return predicate;
}
