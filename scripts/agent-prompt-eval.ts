import { createLogger, organizationScope, type Principal } from "@wasanni/kit";
import { createApp } from "../apps/api/src/app.ts";
import {
  DEFAULT_SYSTEM_PROMPT,
  MODE_INSTRUCTIONS,
  READ_ONLY_TOOL_NAMES,
} from "../apps/api/src/modules/agent/constants.ts";
import { createAgentTools } from "../apps/api/src/modules/agent/tools.ts";
import type { AgentGamePort, AgentIntegrator } from "../apps/api/src/modules/agent/types.ts";
import type { AuditService } from "../apps/api/src/modules/audit/types.ts";
import { INTEGRATION_PROMPT } from "../apps/web/src/lib/agent-integration.ts";
import { appDeps } from "../tests/api/app-deps.ts";

const principal: Principal = {
  kind: "user",
  organizationId: "wsp_0123456789ABCDEF",
  permissions: new Set<string>(),
  userId: "usr_0123456789ABCDEF",
  sessionId: "ses_0123456789ABCDEF",
  memberId: "wsm_0123456789ABCDEF",
  role: "owner",
};

const options = (toolCallId: string) => ({
  toolCallId,
  messages: [],
  context: {},
  observe: {
    span: async <T>(_name: string, run: () => T | Promise<T>): Promise<T> => run(),
    log: (): void => {},
  },
});

type Grade = { criterion: string; pass: boolean; detail: string };

const claimedEndpoints = (text: string): { method: string; path: string }[] => {
  const found: { method: string; path: string }[] = [];

  for (const match of text.matchAll(/(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/\S+)/g)) {
    found.push({ method: match[1] as string, path: (match[2] as string).replace(/[,.;:)]+$/, "") });
  }

  return found;
};

const gradeEndpoints = async (): Promise<Grade> => {
  const criterion = "every endpoint the prompts assert resolves in the api docs the model grounds with";
  const app = await createApp(appDeps());
  const catalog = createAgentTools({
    api: app,
    docsJsonPath: "/docs/json",
    games: {} as unknown as AgentGamePort,
    integrator: {} as unknown as AgentIntegrator,
    scope: organizationScope(principal),
    actor: { memberId: principal.memberId, userId: principal.userId },
    agentRunId: "run_0123456789ABCDEF",
    gameId: null,
    log: createLogger({ level: "error" }),
    audit: { record: async () => {} } as unknown as AuditService,
  });

  const claims = claimedEndpoints(
    `${DEFAULT_SYSTEM_PROMPT}\n${MODE_INSTRUCTIONS.agent}\n${MODE_INSTRUCTIONS.plan}\n${INTEGRATION_PROMPT}`,
  );

  if (claims.length === 0) {
    return { criterion, pass: false, detail: "no METHOD /path claims found in the prompts" };
  }

  const failures: string[] = [];

  for (const { method, path } of claims) {
    const answer = String(await catalog.api_docs.execute?.({ path }, options("eval-docs")));

    if (answer.startsWith("no documented path matches")) {
      failures.push(`${method} ${path}: no documented path matches`);
      continue;
    }

    const item = JSON.parse(answer) as Record<string, Record<string, unknown>>;
    const methods = Object.keys(Object.values(item)[0] ?? {}).map((key) => key.toUpperCase());

    if (!methods.includes(method)) {
      failures.push(`${method} ${path}: documented without ${method} (has ${methods.join(", ") || "nothing"})`);
    }
  }

  return {
    criterion,
    pass: failures.length === 0,
    detail:
      failures.length === 0
        ? `${claims.length} claims resolve`
        : failures.join("; "),
  };
};

const gradePlanCoverage = async (): Promise<Grade> => {
  const criterion = "every tool the catalog offers without approval is offered to a plan run, and nothing else";
  const app = await createApp(appDeps());
  const catalog = createAgentTools({
    api: app,
    docsJsonPath: "/docs/json",
    games: {} as unknown as AgentGamePort,
    integrator: {} as unknown as AgentIntegrator,
    scope: organizationScope(principal),
    actor: { memberId: principal.memberId, userId: principal.userId },
    agentRunId: "run_0123456789ABCDEF",
    gameId: null,
    log: createLogger({ level: "error" }),
    audit: { record: async () => {} } as unknown as AuditService,
  });

  const unapproved = Object.entries(catalog)
    .filter(([, tool]) => (tool as { requireApproval?: boolean }).requireApproval !== true)
    .map(([id]) => id)
    .sort();
  const planned = [...READ_ONLY_TOOL_NAMES].sort();

  const missing = unapproved.filter((id) => !planned.includes(id));
  const leaked = planned.filter((id) => !unapproved.includes(id as never));

  return {
    criterion,
    pass: missing.length === 0 && leaked.length === 0,
    detail:
      missing.length === 0 && leaked.length === 0
        ? `${planned.length} read tools in plan mode`
        : [
            ...(missing.length === 0 ? [] : [`plan mode cannot call: ${missing.join(", ")}`]),
            ...(leaked.length === 0 ? [] : [`plan mode offers unknown tools: ${leaked.join(", ")}`]),
          ].join("; "),
  };
};

const grades = [await gradeEndpoints(), await gradePlanCoverage()];

for (const grade of grades) {
  console.log(`${grade.pass ? "PASS" : "FAIL"} ${grade.criterion}\n     ${grade.detail}`);
}

const passed = grades.filter((grade) => grade.pass).length;

console.log(`\n${passed}/${grades.length} criteria hold`);

if (passed !== grades.length) process.exit(1);
