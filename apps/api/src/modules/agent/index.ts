import type { PrincipalApi } from "../../plugins/types.ts";
import { createAgentService } from "./agent.service.ts";
import { createAgentRoutes } from "./agent.routes.ts";
import type { AgentModuleDeps } from "./types.ts";

export const createAgentModule = <T extends PrincipalApi>(
  api: T,
  deps: Omit<AgentModuleDeps, "api" | "docsJsonPath">,
) => {
  const service = createAgentService({
    ...deps,
    api,
    docsJsonPath: "/docs/json",
  });

  createAgentRoutes(api, { service });

  return api;
};
