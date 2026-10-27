import { and, eq, type SQL } from "drizzle-orm";
import type { Scope } from "@wasanni/kit";
import type { OrganizationScoped } from "./types.ts";

export function scopeTo<T extends OrganizationScoped>(
  scope: Scope,
  table: T,
  ...filters: (SQL | undefined)[]
): SQL {
  const scoped = eq(table.organizationId, scope.organizationId);

  return and(scoped, ...filters) ?? scoped;
}
