import type { apiKey } from "@wasanni/db/schema";
import type { createApiKeyService } from "./service.ts";

export type ApiKeyRow = (typeof apiKey.$inferSelect);

export type ApiKeyPatch = {
  name?: string;
  enabled?: boolean;
};

export type ApiKeyService = ReturnType<typeof createApiKeyService>;

export type ApiKeyDeps = {
  service: ApiKeyService;
};
