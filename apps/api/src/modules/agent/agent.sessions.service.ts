import { asc, desc, eq, sql } from "drizzle-orm";
import { agentProject, agentRun, agentSession } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type {
  AgentProjectView,
  AgentRunView,
  AgentSessionView,
  AgentTurnView,
  CreateAgentProjectBody,
  CreateAgentSessionBody,
  RenameAgentProjectBody,
  UpdateAgentSessionBody,
} from "@wasanni/contracts";
import type { Scope } from "@wasanni/kit";
import { NotFoundError } from "@wasanni/kit";
import { NEW_SESSION_TITLE, RECENT_SESSIONS_LIMIT } from "./constants.ts";
import type { AgentInternals } from "./agent-internals.ts";
import type {
  AgentModuleDeps,
  RunRow,
  SessionTotalRow,
} from "./types.ts";

const toRunView = (row: RunRow): AgentRunView => ({
  id: row.id,
  providerId: row.providerId,
  model: row.model,
  prompt: row.prompt,
  output: row.output,
  status: row.status,
  durationMs: row.durationMs,
  error: row.error,
  createdAt: row.createdAt.toISOString(),
});

const toSessionView = (row: SessionTotalRow): AgentSessionView => ({
  id: row.id,
  gameId: row.gameId,
  projectId: row.projectId,
  title: row.title,
  pinned: row.pinned,
  runs: row.runs,
  updatedAt: row.updatedAt.toISOString(),
});

const toProjectView = (row: typeof agentProject.$inferSelect): AgentProjectView => ({
  id: row.id,
  name: row.name,
  updatedAt: row.updatedAt.toISOString(),
});

const toTurns = (row: RunRow): AgentTurnView[] => {
  const shared = {
    runId: row.id,
    model: row.model,
    status: row.status,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  } as const;

  const turns: AgentTurnView[] = [
    { ...shared, id: `${row.id}-user`, role: "user", text: row.prompt },
  ];

  if (row.output !== null) {
    turns.push({ ...shared, id: `${row.id}-assistant`, role: "assistant", text: row.output });
  }

  return turns;
};

export function createAgentSessionService(deps: AgentModuleDeps, i: AgentInternals) {
  const { db, runtime } = deps;

  const totalsFor = async (
    scope: Scope,
    memberId: string,
    limit: number,
  ): Promise<SessionTotalRow[]> =>
    db
      .select({
        id: agentSession.id,
        organizationId: agentSession.organizationId,
        createdByMemberId: agentSession.createdByMemberId,
        gameId: agentSession.gameId,
        projectId: agentSession.projectId,
        title: agentSession.title,
        pinned: agentSession.pinned,
        createdAt: agentSession.createdAt,
        updatedAt: agentSession.updatedAt,
        runs: sql<number>`count(${agentRun.id})::int`,
      })
      .from(agentSession)
      .leftJoin(agentRun, eq(agentRun.sessionId, agentSession.id))
      .where(scopeTo(scope, agentSession, i.visibleTo(memberId)))
      .groupBy(agentSession.id)
      .orderBy(
        desc(agentSession.pinned),
        asc(agentSession.projectId),
        desc(agentSession.updatedAt),
        desc(agentSession.id),
      )
      .limit(limit);

  return {
    async listSessions(scope: Scope, memberId: string): Promise<AgentSessionView[]> {
      const rows = await totalsFor(scope, memberId, RECENT_SESSIONS_LIMIT);

      return rows.map(toSessionView);
    },

    async listProjects(scope: Scope, memberId: string): Promise<AgentProjectView[]> {
      const rows = await db
        .select()
        .from(agentProject)
        .where(scopeTo(scope, agentProject, i.projectVisibleTo(memberId)))
        .orderBy(desc(agentProject.updatedAt), desc(agentProject.id));

      return rows.map(toProjectView);
    },

    async createProject(
      scope: Scope,
      memberId: string,
      body: CreateAgentProjectBody,
    ): Promise<AgentProjectView> {
      const [row] = await db
        .insert(agentProject)
        .values({
          organizationId: scope.organizationId,
          createdByMemberId: memberId,
          name: body.name,
        })
        .returning();

      if (row === undefined) throw new NotFoundError("agent project not found");

      return toProjectView(row);
    },

    async renameProject(
      scope: Scope,
      memberId: string,
      projectId: string,
      body: RenameAgentProjectBody,
    ): Promise<AgentProjectView> {
      await i.readProject(scope, memberId, projectId);

      const [row] = await db
        .update(agentProject)
        .set({ name: body.name, updatedAt: new Date() })
        .where(eq(agentProject.id, projectId))
        .returning();

      if (row === undefined) throw new NotFoundError("agent project not found");

      return toProjectView(row);
    },

    async deleteProject(scope: Scope, memberId: string, projectId: string): Promise<void> {
      await i.readProject(scope, memberId, projectId);

      await db
        .update(agentSession)
        .set({ projectId: null })
        .where(eq(agentSession.projectId, projectId));

      await db.delete(agentProject).where(eq(agentProject.id, projectId));
    },

    async createSession(
      scope: Scope,
      memberId: string,
      body: CreateAgentSessionBody,
    ): Promise<AgentSessionView> {
      const projectId = body.projectId ?? null;

      if (projectId !== null) {
        await i.readProject(scope, memberId, projectId);
      }

      const row = await i.newSession(
        scope,
        memberId,
        body.title ?? NEW_SESSION_TITLE,
        body.gameId ?? null,
        projectId,
      );

      return toSessionView({ ...row, runs: 0 });
    },

    async updateSession(
      scope: Scope,
      memberId: string,
      sessionId: string,
      body: UpdateAgentSessionBody,
    ): Promise<AgentSessionView> {
      const current = await i.readSession(scope, memberId, sessionId);
      const title = body.title ?? current.title;
      const projectId = body.projectId === undefined ? current.projectId : body.projectId;

      if (projectId !== null && projectId !== current.projectId) {
        await i.readProject(scope, memberId, projectId);
      }

      if (body.title !== undefined && body.title !== current.title) {
        await runtime.memory.updateThread({ id: sessionId, title: body.title });
      }

      const [row] = await db
        .update(agentSession)
        .set({
          title,
          pinned: body.pinned ?? current.pinned,
          projectId,
          updatedAt: current.updatedAt,
        })
        .where(scopeTo(scope, agentSession, eq(agentSession.id, sessionId)))
        .returning();

      if (row === undefined) throw new NotFoundError("agent session not found");

      return toSessionView({ ...row, runs: 0 });
    },

    async deleteSession(scope: Scope, memberId: string, sessionId: string): Promise<void> {
      await i.readSession(scope, memberId, sessionId);

      await runtime.memory.deleteThread(sessionId);

      await db
        .delete(agentSession)
        .where(scopeTo(scope, agentSession, eq(agentSession.id, sessionId)));
    },

    async messages(
      scope: Scope,
      memberId: string,
      sessionId: string,
    ): Promise<AgentTurnView[]> {
      await i.readSession(scope, memberId, sessionId);

      const rows = await db
        .select()
        .from(agentRun)
        .where(scopeTo(scope, agentRun, eq(agentRun.sessionId, sessionId)))
        .orderBy(asc(agentRun.createdAt));

      return rows.flatMap(toTurns);
    },

    async listRuns(scope: Scope, limit: number): Promise<AgentRunView[]> {
      const rows = await db
        .select()
        .from(agentRun)
        .where(scopeTo(scope, agentRun))
        .orderBy(desc(agentRun.createdAt))
        .limit(limit);

      return rows.map(toRunView);
    },

  };
}
