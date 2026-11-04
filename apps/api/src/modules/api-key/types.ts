import type { createApiKeyService } from "./service.ts";

export type ApiKeyPatch = { name?: string; enabled?: boolean };

export type ApiKeyService = ReturnType<typeof createApiKeyService>;

export type ApiKeyDeps = { service: ApiKeyService };
