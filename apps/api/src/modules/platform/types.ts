import type { platform } from "@wasanni/db/schema";
import type { createPlatformService } from "./service.ts";

export type PlatformRow = (typeof platform.$inferSelect);

export type PlatformPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
};

export type PlatformService = ReturnType<typeof createPlatformService>;

export type PlatformDeps = {
  service: PlatformService;
};
