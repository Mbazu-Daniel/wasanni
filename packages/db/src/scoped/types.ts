import type { AnyPgColumn } from "drizzle-orm/pg-core";

export type WorkspaceScoped = { workspaceId: AnyPgColumn };
