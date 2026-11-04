import type { Db } from "@wasanni/db";
import type { agentProvider, agentRun, agentSession } from "@wasanni/db/schema";
import type {
  AgentRunStatus,
  AssignmentView,
  BracketView,
  CreateApiKeyBody,
  CreateGameBody,
  CreatePlatformBody,
  CreatedApiKey,
  GameHosting,
  GameStatus,
  GameView,
  LeaderboardList,
  GameLeaderboardQuery,
  MatchParticipantView,
  MatchView,
  ParticipantView,
  PlatformView,
  ScoreView,
  Standings,
  TournamentView,
} from "@wasanni/contracts";
import type { Logger, Scope } from "@wasanni/kit";
import type { createAgentService } from "./agent.service.ts";
import type { AgentRuntime } from "./mastra.ts";
import type { ProviderErrorCode, ProviderFailure } from "./provider-error.ts";
import type { UsageService } from "../usage/types.ts";
import type { AuditService } from "../audit/types.ts";
import type {
  CompleteMatchInput,
  CreateMatchInput,
  CreateTournamentInput,
  RegisterParticipantInput,
  TournamentFilter,
} from "../competition/types.ts";
import type { ScoreSubmitInput } from "../play/types.ts";
import type { AssignmentCreateInput } from "../games/types.ts";

export type AgentService = ReturnType<typeof createAgentService>;

export type ProviderRow = typeof agentProvider.$inferSelect;

export type RunRow = typeof agentRun.$inferSelect;

export type SessionRow = typeof agentSession.$inferSelect;

export type SessionTotalRow = SessionRow & {
  readonly runs: number;
};

export type PlatformProvider = {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
};

export type AgentOrgContext = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type AgentGameContext = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly hosting: GameHosting;
  readonly status: GameStatus;
  readonly currentVersion: string | null;
};

export type AgentGamePort = {
  list(scope: Scope): Promise<GameView[]>;
  create(scope: Scope, input: CreateGameBody): Promise<GameView>;
  context(scope: Scope, gameId: string): Promise<AgentGameContext | null>;
  deploy(
    scope: Scope,
    memberId: string,
    gameId: string,
    html: string,
    platformId?: string,
  ): Promise<{ version: string; url: string }>
};

export type AgentIntegrator = {
  apiKeys: {
    create(
      scope: Scope,
      actorUserId: string,
      input: CreateApiKeyBody,
    ): Promise<CreatedApiKey>;
  };
  assignments: {
    create(scope: Scope, input: AssignmentCreateInput): Promise<AssignmentView>;
    listByGame(scope: Scope, gameId: string): Promise<AssignmentView[]>;
  };
  brackets: {
    generateBracket(scope: Scope, tournamentId: string): Promise<BracketView>;
  };
  leaderboards: {
    list(
      scope: Scope,
      gameId: string,
      query: GameLeaderboardQuery,
    ): Promise<LeaderboardList>;
  };
  matches: {
    complete(scope: Scope, input: CompleteMatchInput): Promise<MatchView>;
    create(scope: Scope, input: CreateMatchInput): Promise<MatchView>;
    get(scope: Scope, matchId: string): Promise<MatchView>;
    listParticipants(scope: Scope, matchId: string): Promise<MatchParticipantView[]>;
  };
  participants: {
    register(scope: Scope, input: RegisterParticipantInput): Promise<ParticipantView>;
  };
  platforms: {
    list(scope: Scope): Promise<PlatformView[]>;
    create(scope: Scope, input: CreatePlatformBody): Promise<PlatformView>;
  };
  scores: {
    submitFromServer(scope: Scope, input: ScoreSubmitInput): Promise<ScoreView>;
  };
  standings: { read(scope: Scope, tournamentId: string): Promise<Standings> };
  tournaments: {
    cancel(scope: Scope, tournamentId: string): Promise<TournamentView>;
    create(scope: Scope, input: CreateTournamentInput): Promise<TournamentView>;
    get(scope: Scope, tournamentId: string): Promise<TournamentView>;
    list(scope: Scope, filter?: TournamentFilter): Promise<TournamentView[]>;
    open(scope: Scope, tournamentId: string): Promise<TournamentView>;
  };
};

export type AgentModuleDeps = {
  api: { handle(request: Request): Response | Promise<Response> };
  docsJsonPath: string;
  db: Db;
  logger: Logger;
  usage: UsageService;
  encryptionKey: string;
  allowPrivateOutbound: boolean;
  runtime: AgentRuntime;
  platformProvider: PlatformProvider | null;
  games: AgentGamePort;
  integrator: AgentIntegrator;
  audit: AuditService;
};

export type RunEvent =
  | { kind: "delta"; text: string; step: number }
  | { kind: "thinking"; text: string; step: number }
  | { kind: "tool"; tool: string; state: "call" | "result"; ok: boolean }
  | {
      kind: "approval";
      agentRunId: string;
      callId: string;
      tool: string;
      args: unknown;
    }
  | { kind: "done"; runId: string; sessionId: string; model: string; durationMs: number }
  | {
      kind: "error";
      code: ProviderErrorCode | "request_refused";
      message: string;
      retryable: boolean;
    };

export type RunLeg = {
  readonly state: AgentRunStatus;
  readonly output: string;
  readonly parked: Extract<RunEvent, { kind: "approval" }> | null;
  readonly failure: ProviderFailure | null;
};
