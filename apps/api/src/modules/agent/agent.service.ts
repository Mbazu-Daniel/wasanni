import { createAgentInternals } from "./agent-internals.ts";
import { createAgentProviderService } from "./agent.providers.service.ts";
import { createAgentSessionService } from "./agent.sessions.service.ts";
import { createAgentRunService } from "./agent.run.service.ts";
import type { AgentModuleDeps } from "./types.ts";

export function createAgentService(deps: AgentModuleDeps) {
  const i = createAgentInternals(deps);

  return {
    ...createAgentProviderService(deps, i),
    ...createAgentSessionService(deps, i),
    ...createAgentRunService(deps, i),
  };
}
