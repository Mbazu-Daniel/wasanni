import type { PrincipalApi, RateLimitHook } from "../../plugins/types.ts";
import { createAssistantService } from "./assistant.service.ts";
import { createAssistantRoutes } from "./assistant.routes.ts";
import type { AssistantDeps } from "./types.ts";

export const createAssistantModule = <T extends PrincipalApi>(
  api: T,
  deps: AssistantDeps & { rateLimit: RateLimitHook },
) => {
  const { rateLimit, ...assistantDeps } = deps;
  const service = createAssistantService(assistantDeps);

  createAssistantRoutes(api, { service, rateLimit });

  return api;
};
