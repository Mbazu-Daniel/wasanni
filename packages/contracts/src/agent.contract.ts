import { t, type UnwrapSchema } from "elysia";

export const AGENT_RUN_STATUSES = [
  "succeeded",
  "failed",
  "refused",
  "awaiting_approval",
] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

const SpecId = t.String({ minLength: 1, maxLength: 120 });
export type AgentProviderSpecId = string;

export const AgentSpecModel = t.Object({
  id: t.String(),
  label: t.String(),
});
export type AgentSpecModel = UnwrapSchema<typeof AgentSpecModel>;

export const AgentSpecView = t.Object({
  id: SpecId,
  label: t.String(),
  baseUrl: t.String(),
  models: t.Array(AgentSpecModel),
});
export type AgentSpecView = UnwrapSchema<typeof AgentSpecView>;

export const AgentSpecList = t.Object({ specs: t.Array(AgentSpecView) });
export type AgentSpecList = UnwrapSchema<typeof AgentSpecList>;

export const AgentRunStatusSchema = t.Union([
  t.Literal("succeeded"),
  t.Literal("failed"),
  t.Literal("refused"),
  t.Literal("awaiting_approval"),
]);

export const AgentProviderView = t.Object({
  id: t.String(),
  name: t.String(),
  spec: SpecId,
  baseUrl: t.String(),
  model: t.String(),
  hasKey: t.Boolean(),
  isDefault: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
});
export type AgentProviderView = UnwrapSchema<typeof AgentProviderView>;

export const AgentProviderList = t.Object({
  providers: t.Array(AgentProviderView),
});
export type AgentProviderList = UnwrapSchema<typeof AgentProviderList>;

export const CreateAgentProviderBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  spec: SpecId,
  model: t.String({ minLength: 1, maxLength: 200 }),
  baseUrl: t.Optional(t.String({ format: "uri", maxLength: 500 })),
  apiKey: t.Optional(t.String({ minLength: 1, maxLength: 400 })),
  isDefault: t.Optional(t.Boolean()),
});
export type CreateAgentProviderBody = UnwrapSchema<
  typeof CreateAgentProviderBody
>;

export const UpdateAgentProviderBody = t.Object({
  model: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  baseUrl: t.Optional(t.String({ format: "uri", maxLength: 500 })),
  apiKey: t.Optional(t.String({ minLength: 1, maxLength: 400 })),
  isDefault: t.Optional(t.Boolean()),
});
export type UpdateAgentProviderBody = UnwrapSchema<
  typeof UpdateAgentProviderBody
>;

export const AgentModelList = t.Object({
  models: t.Array(t.String()),
});
export type AgentModelList = UnwrapSchema<typeof AgentModelList>;

export const AgentRunView = t.Object({
  id: t.String(),
  providerId: t.Nullable(t.String()),
  model: t.String(),
  prompt: t.String(),
  output: t.Nullable(t.String()),
  status: AgentRunStatusSchema,
  durationMs: t.Number(),
  error: t.Nullable(t.String()),
  createdAt: t.String({ format: "date-time" }),
});
export type AgentRunView = UnwrapSchema<typeof AgentRunView>;

export const AgentRunList = t.Object({ runs: t.Array(AgentRunView) });
export type AgentRunList = UnwrapSchema<typeof AgentRunList>;

export const AgentAttachment = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  mediaType: t.String({ minLength: 1, maxLength: 120 }),
  data: t.String({ minLength: 1, maxLength: 8_000_000 }),
});
export type AgentAttachment = UnwrapSchema<typeof AgentAttachment>;

export const AgentRunMode = t.Union([t.Literal("agent"), t.Literal("plan")]);
export type AgentRunMode = UnwrapSchema<typeof AgentRunMode>;

export const RunAgentBody = t.Object({
  prompt: t.String({ minLength: 1, maxLength: 32_000 }),
  providerId: t.Optional(t.String()),
  sessionId: t.Optional(t.String()),
  gameId: t.Optional(t.String()),
  mode: t.Optional(AgentRunMode),
  attachments: t.Optional(
    t.Array(AgentAttachment, { maxItems: 8 }),
  ),
});
export type RunAgentBody = UnwrapSchema<typeof RunAgentBody>;

export const AgentProjectView = t.Object({
  id: t.String(),
  name: t.String(),
  updatedAt: t.String({ format: "date-time" }),
});
export type AgentProjectView = UnwrapSchema<typeof AgentProjectView>;

export const AgentProjectList = t.Object({ projects: t.Array(AgentProjectView) });
export type AgentProjectList = UnwrapSchema<typeof AgentProjectList>;

export const CreateAgentProjectBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
});
export type CreateAgentProjectBody = UnwrapSchema<typeof CreateAgentProjectBody>;

export const RenameAgentProjectBody = CreateAgentProjectBody;
export type RenameAgentProjectBody = CreateAgentProjectBody;

export const AgentSessionView = t.Object({
  id: t.String(),
  gameId: t.Nullable(t.String()),
  projectId: t.Nullable(t.String()),
  title: t.String(),
  pinned: t.Boolean(),
  runs: t.Number(),
  updatedAt: t.String({ format: "date-time" }),
});
export type AgentSessionView = UnwrapSchema<typeof AgentSessionView>;

export const AgentSessionList = t.Object({
  sessions: t.Array(AgentSessionView),
});
export type AgentSessionList = UnwrapSchema<typeof AgentSessionList>;

export const CreateAgentSessionBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  gameId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
});
export type CreateAgentSessionBody = UnwrapSchema<typeof CreateAgentSessionBody>;

export const UpdateAgentSessionBody = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  pinned: t.Optional(t.Boolean()),
  projectId: t.Optional(t.Nullable(t.String())),
  gameId: t.Optional(t.Nullable(t.String())),
});
export type UpdateAgentSessionBody = UnwrapSchema<typeof UpdateAgentSessionBody>;

export const AgentTurnView = t.Object({
  id: t.String(),
  runId: t.String(),
  role: t.Union([t.Literal("user"), t.Literal("assistant")]),
  text: t.String(),
  model: t.String(),
  status: AgentRunStatusSchema,
  durationMs: t.Number(),
  createdAt: t.String({ format: "date-time" }),
});
export type AgentTurnView = UnwrapSchema<typeof AgentTurnView>;

export const AgentSessionMessages = t.Object({
  turns: t.Array(AgentTurnView),
});
export type AgentSessionMessages = UnwrapSchema<typeof AgentSessionMessages>;

export const ListAgentModelsBody = t.Object({
  spec: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  baseUrl: t.Optional(t.String({ format: "uri", maxLength: 500 })),
  apiKey: t.Optional(t.String({ minLength: 1, maxLength: 400 })),
  providerId: t.Optional(t.String()),
});
export type ListAgentModelsBody = UnwrapSchema<typeof ListAgentModelsBody>;

export const AgentParams = t.Object({
  organizationId: t.String(),
  providerId: t.String(),
});
export type AgentParams = UnwrapSchema<typeof AgentParams>;

export const ApproveAgentRunBody = t.Object({
  agentRunId: t.String({ minLength: 1, maxLength: 64 }),
  callId: t.String({ minLength: 1, maxLength: 200 }),
  approved: t.Boolean(),
});
export type ApproveAgentRunBody = UnwrapSchema<typeof ApproveAgentRunBody>;

export const AgentPendingApproval = t.Object({
  agentRunId: t.String(),
  callId: t.String(),
  tool: t.String(),
  args: t.Unknown(),
});
export type AgentPendingApproval = UnwrapSchema<typeof AgentPendingApproval>;

export const AgentApprovalList = t.Object({
  pending: t.Array(AgentPendingApproval),
});
export type AgentApprovalList = UnwrapSchema<typeof AgentApprovalList>;

export const AgentSessionParams = t.Object({
  organizationId: t.String(),
  sessionId: t.String(),
});
export type AgentSessionParams = UnwrapSchema<typeof AgentSessionParams>;

export const AgentProjectParams = t.Object({
  organizationId: t.String(),
  projectId: t.String(),
});
export type AgentProjectParams = UnwrapSchema<typeof AgentProjectParams>;

export const OrganizationIdAgentParams = t.Object({
  organizationId: t.String(),
});
export type OrganizationIdAgentParams = UnwrapSchema<
  typeof OrganizationIdAgentParams
>;
