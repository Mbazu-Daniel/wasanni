import {
  AgentApprovalList,
  AgentModelList,
  AgentParams,
  AgentProjectList,
  AgentProjectParams,
  AgentProjectView,
  AgentProviderList,
  AgentProviderView,
  AgentRunList,
  AgentSessionList,
  AgentSessionMessages,
  AgentSessionParams,
  AgentSessionView,
  AgentSpecList,
  AgentSpendQuery,
  AgentSpendView,
  ApproveAgentRunBody,
  CreateAgentProjectBody,
  CreateAgentProviderBody,
  CreateAgentSessionBody,
  ListAgentModelsBody,
  OrganizationIdAgentParams,
  PERMISSION,
  RenameAgentProjectBody,
  RunAgentBody,
  UpdateAgentProviderBody,
  UpdateAgentSessionBody,
} from "@wasanni/contracts";
import { HttpError, organizationScope } from "@wasanni/kit";
import { requestContextOf } from "../../plugins/request-context.ts";
import type { PrincipalApi } from "../../plugins/types.ts";
import { RECENT_RUNS_LIMIT, SPEND_WINDOW_DAYS } from "./constants.ts";
import { classifyProviderError } from "./provider-error.ts";
import type { AgentService, RunEvent } from "./types.ts";

const encoder = new TextEncoder();

const failureEvent = (error: unknown): RunEvent => {
  if (error instanceof HttpError) {
    return {
      kind: "error",
      code: "request_refused",
      message: error.message,
      retryable: false,
    };
  }

  const failure = classifyProviderError(error);

  return {
    kind: "error",
    code: failure.code,
    message: failure.message,
    retryable: failure.retryable,
  };
};

const sse = (events: AsyncGenerator<RunEvent, void, void>): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        let next: IteratorResult<RunEvent, void>;
        try {
          next = await events.next();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(failureEvent(error))}\n\n`),
          );
          controller.close();
          return;
        }

        if (next.done ?? false) {
          controller.close();
          return;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`),
        );
      },
      async cancel() {
        await events.return();
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
      },
    },
  );

export const createAgentRoutes = <T extends PrincipalApi>(
  api: T,
  { service }: { service: AgentService },
) =>
  api
    .get(
      "/api/v1/organizations/:organizationId/agents/specs",
      async () => ({ specs: await service.specs() }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        response: { 200: AgentSpecList },
        detail: { tags: ["agents"], summary: "List the model providers this API can reach" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/providers",
      async ({ principal }) => ({
        providers: await service.listProviders(organizationScope(principal)),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        response: { 200: AgentProviderList },
        detail: { tags: ["agents"], summary: "List the model providers of an organization" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/providers",
      async ({ principal, body, status }) =>
        status(
          201,
          await service.createProvider(
            organizationScope(principal),
            principal.memberId,
            body,
          ),
        ),
      {
        organizationAuth: PERMISSION.agentCreate,
        params: OrganizationIdAgentParams,
        body: CreateAgentProviderBody,
        response: { 201: AgentProviderView },
        detail: { tags: ["agents"], summary: "Add a model provider" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/agents/providers/:providerId",
      async ({ principal, params, body }) =>
        service.updateProvider(
          organizationScope(principal),
          params.providerId,
          body,
        ),
      {
        organizationAuth: PERMISSION.agentUpdate,
        params: AgentParams,
        body: UpdateAgentProviderBody,
        response: { 200: AgentProviderView },
        detail: { tags: ["agents"], summary: "Update a model provider" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/agents/providers/:providerId",
      async ({ principal, params, status }) => {
        await service.deleteProvider(organizationScope(principal), params.providerId);
        return status(204);
      },
      {
        organizationAuth: PERMISSION.agentDelete,
        params: AgentParams,
        detail: { tags: ["agents"], summary: "Remove a model provider" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/sessions",
      async ({ principal }) => ({
        sessions: await service.listSessions(
          organizationScope(principal),
          principal.memberId,
        ),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        response: { 200: AgentSessionList },
        detail: { tags: ["agents"], summary: "List the agent sessions of an organization" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/projects",
      async ({ principal }) => ({
        projects: await service.listProjects(
          organizationScope(principal),
          principal.memberId,
        ),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        response: { 200: AgentProjectList },
        detail: { tags: ["agents"], summary: "List the agent projects of an organization" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/projects",
      async ({ principal, body, status }) =>
        status(
          201,
          await service.createProject(
            organizationScope(principal),
            principal.memberId,
            body,
          ),
        ),
      {
        organizationAuth: PERMISSION.agentCreate,
        params: OrganizationIdAgentParams,
        body: CreateAgentProjectBody,
        response: { 201: AgentProjectView },
        detail: { tags: ["agents"], summary: "Create an agent project" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/agents/projects/:projectId",
      async ({ principal, params, body }) =>
        service.renameProject(
          organizationScope(principal),
          principal.memberId,
          params.projectId,
          body,
        ),
      {
        organizationAuth: PERMISSION.agentUpdate,
        params: AgentProjectParams,
        body: RenameAgentProjectBody,
        response: { 200: AgentProjectView },
        detail: { tags: ["agents"], summary: "Rename an agent project" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/agents/projects/:projectId",
      async ({ principal, params, status }) => {
        await service.deleteProject(
          organizationScope(principal),
          principal.memberId,
          params.projectId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.agentDelete,
        params: AgentProjectParams,
        detail: {
          tags: ["agents"],
          summary: "Delete an agent project and free its sessions",
        },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/sessions",
      async ({ principal, body, status }) =>
        status(
          201,
          await service.createSession(
            organizationScope(principal),
            principal.memberId,
            body,
          ),
        ),
      {
        organizationAuth: PERMISSION.agentCreate,
        params: OrganizationIdAgentParams,
        body: CreateAgentSessionBody,
        response: { 201: AgentSessionView },
        detail: { tags: ["agents"], summary: "Start an agent session" },
      },
    )
    .patch(
      "/api/v1/organizations/:organizationId/agents/sessions/:sessionId",
      async ({ principal, params, body }) =>
        service.updateSession(
          organizationScope(principal),
          principal.memberId,
          params.sessionId,
          body,
        ),
      {
        organizationAuth: PERMISSION.agentUpdate,
        params: AgentSessionParams,
        body: UpdateAgentSessionBody,
        response: { 200: AgentSessionView },
        detail: { tags: ["agents"], summary: "Rename or pin an agent session" },
      },
    )
    .delete(
      "/api/v1/organizations/:organizationId/agents/sessions/:sessionId",
      async ({ principal, params, status }) => {
        await service.deleteSession(
          organizationScope(principal),
          principal.memberId,
          params.sessionId,
        );
        return status(204);
      },
      {
        organizationAuth: PERMISSION.agentDelete,
        params: AgentSessionParams,
        detail: { tags: ["agents"], summary: "Delete an agent session and its runs" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/sessions/:sessionId/messages",
      async ({ principal, params }) => ({
        turns: await service.messages(
          organizationScope(principal),
          principal.memberId,
          params.sessionId,
        ),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: AgentSessionParams,
        response: { 200: AgentSessionMessages },
        detail: { tags: ["agents"], summary: "List the turns of an agent session" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/models",
      async ({ principal, body }) => ({
        models: await service.models(organizationScope(principal), body),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        body: ListAgentModelsBody,
        response: { 200: AgentModelList },
        detail: { tags: ["agents"], summary: "List the models a provider exposes" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/runs",
      async ({ principal }) => ({
        runs: await service.listRuns(organizationScope(principal), RECENT_RUNS_LIMIT),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        response: { 200: AgentRunList },
        detail: { tags: ["agents"], summary: "List the recent agent runs" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/spend",
      async ({ principal, query }) =>
        service.spend(
          organizationScope(principal),
          query.days ?? SPEND_WINDOW_DAYS,
        ),
      {
        organizationAuth: PERMISSION.agentRead,
        params: OrganizationIdAgentParams,
        query: AgentSpendQuery,
        response: { 200: AgentSpendView },
        detail: { tags: ["agents"], summary: "Read the agent spend of an organization" },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/run",
      async ({ principal, body, request }) =>
        sse(
          service.run(
            organizationScope(principal),
            principal.memberId,
            principal.userId,
            body,
            requestContextOf(request).requestId,
          ),
        ),
      {
        organizationAuth: PERMISSION.agentCreate,
        params: OrganizationIdAgentParams,
        body: RunAgentBody,
        detail: { tags: ["agents"], summary: "Run a prompt through a model provider" },
      },
    )
    .get(
      "/api/v1/organizations/:organizationId/agents/sessions/:sessionId/approvals",
      async ({ principal, params, request }) => ({
        pending: await service.pending(
          organizationScope(principal),
          principal.memberId,
          principal.userId,
          params.sessionId,
          requestContextOf(request).requestId,
        ),
      }),
      {
        organizationAuth: PERMISSION.agentRead,
        params: AgentSessionParams,
        response: { 200: AgentApprovalList },
        detail: {
          tags: ["agents"],
          summary: "List the tool calls an agent session is waiting on",
        },
      },
    )
    .post(
      "/api/v1/organizations/:organizationId/agents/sessions/:sessionId/approvals",
      async ({ principal, body, request }) =>
        sse(
          service.approve(
            organizationScope(principal),
            principal.memberId,
            principal.userId,
            body,
            requestContextOf(request).requestId,
          ),
        ),
      {
        organizationAuth: PERMISSION.agentCreate,
        params: AgentSessionParams,
        body: ApproveAgentRunBody,
        detail: {
          tags: ["agents"],
          summary: "Allow or deny a tool call the agent is waiting on",
        },
      },
    );
