import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import {
  game,
  gameConfig,
  gamePlatformAssignment,
  platform,
  template,
  tournament,
  tournamentParticipant,
} from "@wasanni/db/schema";
import { ConflictError, InternalServerError, newId, NotFoundError } from "@wasanni/kit";
import type { Scope } from "@wasanni/kit";
import type { UsageService } from "../usage/types.ts";
import type { ParticipantView, TournamentView } from "@wasanni/contracts";
import type {
  CreateTournamentInput,
  Executor,
  RegisterParticipantInput,
  TournamentFilter,
  UpdateTournamentInput,
  WithdrawTarget,
} from "./types.ts";
import { toParticipantView, toTournamentView } from "./views.ts";

export async function readTournamentRow(
  db: Db,
  scope: Scope,
  tournamentId: string,
): Promise<TournamentView> {
  const [row] = await db
    .select()
    .from(tournament)
    .where(scopeTo(scope, tournament, eq(tournament.id, tournamentId)))
    .limit(1);

  if (row === undefined) throw new NotFoundError("tournament not found");
  return toTournamentView(row);
}

async function requireScoped(
  exec: Executor,
  input: {
    table:
      | typeof game
      | typeof gamePlatformAssignment
      | typeof gameConfig
      | typeof template;
    scope: Scope;
    id: string;
    message: string;
  },
): Promise<void> {
  const [row] = await exec
    .select({ id: input.table.id })
    .from(input.table)
    .where(scopeTo(input.scope, input.table, eq(input.table.id, input.id)))
    .limit(1);

  if (row === undefined) throw new NotFoundError(input.message);
}

export function createTournamentService(db: Db, usage: UsageService | null) {
  const readRow = (scope: Scope, tournamentId: string) =>
    readTournamentRow(db, scope, tournamentId);

  const enrich = async (rows: TournamentView[]): Promise<TournamentView[]> => {
    if (rows.length === 0) return [];

    const gameIds = [...new Set(rows.map((row) => row.gameId))];
    const assignmentIds = [
      ...new Set(rows.map((row) => row.assignmentId).filter((id): id is string => id !== null)),
    ];

    const games = await db
      .select({ id: game.id, name: game.name, slug: game.slug, hosting: game.hosting })
      .from(game)
      .where(inArray(game.id, gameIds));

    const assignments = await db
      .select({ id: gamePlatformAssignment.id, platformId: gamePlatformAssignment.platformId })
      .from(gamePlatformAssignment)
      .where(inArray(gamePlatformAssignment.id, assignmentIds));

    const platformIds = [...new Set(assignments.map((row) => row.platformId))];

    const platforms = await db
      .select({ id: platform.id, name: platform.name, slug: platform.slug })
      .from(platform)
      .where(inArray(platform.id, platformIds));

    const gameById = new Map(games.map((row) => [row.id, row]));
    const assignmentById = new Map(assignments.map((row) => [row.id, row]));
    const platformById = new Map(platforms.map((row) => [row.id, row]));

    return rows.map((row) => {
      const assignment = row.assignmentId === null ? undefined : assignmentById.get(row.assignmentId);
      const owner = assignment === undefined ? undefined : platformById.get(assignment.platformId);

      return {
        ...row,
        game: gameById.get(row.gameId) ?? null,
        platform: owner ?? null,
      };
    });
  };

  return {
    async create(
      scope: Scope,
      input: CreateTournamentInput,
    ): Promise<TournamentView> {
      const { body } = input;

      await requireScoped(db, {
        table: game,
        scope,
        id: body.gameId,
        message: "game not found",
      });

      if (body.assignmentId !== undefined) {
        await requireScoped(db, {
          table: gamePlatformAssignment,
          scope,
          id: body.assignmentId,
          message: "assignment not found",
        });
      }
      if (body.gameConfigId !== undefined) {
        await requireScoped(db, {
          table: gameConfig,
          scope,
          id: body.gameConfigId,
          message: "game config not found",
        });
      }
      if (body.templateId !== undefined) {
        await requireScoped(db, {
          table: template,
          scope,
          id: body.templateId,
          message: "template not found",
        });
      }

      const [existing] = await db
        .select({ id: tournament.id })
        .from(tournament)
        .where(
          and(
            eq(tournament.organizationId, scope.organizationId),
            eq(tournament.slug, body.slug),
          ),
        )
        .limit(1);

      if (existing !== undefined) {
        throw new ConflictError("tournament slug already exists");
      }

      const [row] = await db
        .insert(tournament)
        .values({
          id: newId(),
          organizationId: scope.organizationId,
          gameId: body.gameId,
          assignmentId: body.assignmentId ?? null,
          gameConfigId: body.gameConfigId ?? null,
          templateId: body.templateId ?? null,
          name: body.name,
          slug: body.slug,
          description: body.description ?? null,
          format: body.format,
          maxParticipants: body.maxParticipants ?? null,
          startsAt: body.startsAt === undefined ? null : new Date(body.startsAt),
          endsAt: body.endsAt === undefined ? null : new Date(body.endsAt),
        })
        .returning();

      if (row === undefined) throw new InternalServerError("tournament insert returned no row");

      if (usage !== null) {
        await usage.incr({
          organizationId: scope.organizationId,
          platformId: null,
          metric: "tournaments_created",
        });
      }

      return toTournamentView(row);
    },

    async list(
      scope: Scope,
      filter: TournamentFilter = {},
    ): Promise<TournamentView[]> {
      const rows = await db
        .select()
        .from(tournament)
        .where(
          scopeTo(
            scope,
            tournament,
            filter.gameId === undefined
              ? undefined
              : eq(tournament.gameId, filter.gameId),
            filter.status === undefined
              ? undefined
              : eq(tournament.status, filter.status),
            filter.format === undefined
              ? undefined
              : eq(tournament.format, filter.format),
          ),
        )
        .orderBy(desc(tournament.createdAt));

      return enrich(rows.map(toTournamentView));
    },

    async get(scope: Scope, tournamentId: string): Promise<TournamentView> {
      const [enriched] = await enrich([await readRow(scope, tournamentId)]);
      return enriched ?? (await readRow(scope, tournamentId));
    },

    async complete(scope: Scope, tournamentId: string): Promise<TournamentView> {
      const current = await readRow(scope, tournamentId);

      if (current.format !== "leaderboard") {
        throw new ConflictError("only a leaderboard tournament can be completed directly");
      }

      if (current.status === "completed") return current;

      if (current.status === "cancelled") {
        throw new ConflictError("a cancelled tournament cannot be completed");
      }

      if (current.status !== "open") {
        throw new ConflictError("only an open tournament can be completed");
      }

      const [row] = await db
        .update(tournament)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tournament.id, current.id))
        .returning();

      if (row === undefined) throw new NotFoundError("tournament not found");

      const [enriched] = await enrich([toTournamentView(row)]);
      return enriched ?? toTournamentView(row);
    },

    async update(
      scope: Scope,
      input: UpdateTournamentInput,
    ): Promise<TournamentView> {
      const current = await readRow(scope, input.tournamentId);
      const { body } = input;

      if (current.status === "completed" || current.status === "cancelled") {
        throw new ConflictError("a finished tournament cannot be edited");
      }

      if (body.slug !== undefined && body.slug !== current.slug) {
        const [clash] = await db
          .select({ id: tournament.id })
          .from(tournament)
          .where(
            and(
              eq(tournament.organizationId, scope.organizationId),
              eq(tournament.slug, body.slug),
            ),
          )
          .limit(1);

        if (clash !== undefined) throw new ConflictError("tournament slug already exists");
      }

      const patch: Partial<typeof tournament.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) patch.name = body.name;
      if (body.slug !== undefined) patch.slug = body.slug;
      if (body.description !== undefined) patch.description = body.description;
      if (body.maxParticipants !== undefined) {
        patch.maxParticipants = body.maxParticipants;
      }
      if (body.startsAt !== undefined) {
        patch.startsAt = body.startsAt === null ? null : new Date(body.startsAt);
      }
      if (body.endsAt !== undefined) {
        patch.endsAt = body.endsAt === null ? null : new Date(body.endsAt);
      }
      if (body.gameConfigId !== undefined) patch.gameConfigId = body.gameConfigId;
      if (body.templateId !== undefined) patch.templateId = body.templateId;

      const [row] = await db
        .update(tournament)
        .set(patch)
        .where(eq(tournament.id, current.id))
        .returning();

      if (row === undefined) throw new NotFoundError("tournament not found");
      return toTournamentView(row);
    },

    async open(scope: Scope, tournamentId: string): Promise<TournamentView> {
      const current = await readRow(scope, tournamentId);

      if (current.status !== "draft") {
        throw new ConflictError("only a draft tournament can be opened");
      }

      const [row] = await db
        .update(tournament)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(tournament.id, current.id))
        .returning();

      if (row === undefined) throw new NotFoundError("tournament not found");
      return toTournamentView(row);
    },

    async cancel(scope: Scope, tournamentId: string): Promise<TournamentView> {
      const current = await readRow(scope, tournamentId);

      if (current.status === "completed") {
        throw new ConflictError("a completed tournament cannot be cancelled");
      }

      const [row] = await db
        .update(tournament)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(tournament.id, current.id))
        .returning();

      if (row === undefined) throw new NotFoundError("tournament not found");
      return toTournamentView(row);
    },

    async register(
      scope: Scope,
      input: RegisterParticipantInput,
    ): Promise<ParticipantView> {
      const current = await readRow(scope, input.tournamentId);

      if (current.status !== "open") {
        throw new ConflictError("registration is not open");
      }

      const [existing] = await db
        .select()
        .from(tournamentParticipant)
        .where(
          and(
            eq(tournamentParticipant.tournamentId, current.id),
            eq(tournamentParticipant.platformId, input.platformId),
            eq(tournamentParticipant.externalUserId, input.externalUserId),
          ),
        )
        .limit(1);

      if (existing !== undefined) {
        if (existing.status !== "withdrawn") return toParticipantView(existing);

        const [revived] = await db
          .update(tournamentParticipant)
          .set({
            status: "registered",
            withdrawnAt: null,
            displayName: input.displayName ?? existing.displayName,
          })
          .where(eq(tournamentParticipant.id, existing.id))
          .returning();

        if (revived === undefined) throw new NotFoundError("registration not found");
        return toParticipantView(revived);
      }

      if (current.maxParticipants !== null) {
        const registered = await db
          .select({ id: tournamentParticipant.id })
          .from(tournamentParticipant)
          .where(
            and(
              eq(tournamentParticipant.tournamentId, current.id),
              eq(tournamentParticipant.status, "registered"),
            ),
          );

        if (registered.length >= current.maxParticipants) {
          throw new ConflictError("tournament is full");
        }
      }

      const [row] = await db
        .insert(tournamentParticipant)
        .values({
          id: newId(),
          organizationId: scope.organizationId,
          tournamentId: current.id,
          platformId: input.platformId,
          externalUserId: input.externalUserId,
          displayName: input.displayName ?? null,
        })
        .returning();

      if (row === undefined) {
        throw new InternalServerError("tournament participant insert returned no row");
      }
      return toParticipantView(row);
    },

    async withdraw(
      scope: Scope,
      tournamentId: string,
      target: WithdrawTarget,
    ): Promise<void> {
      const current = await readRow(scope, tournamentId);

      if (current.status === "completed" || current.status === "cancelled") {
        throw new ConflictError("a finished tournament cannot be withdrawn from");
      }

      const identity =
        "participantId" in target
          ? eq(tournamentParticipant.id, target.participantId)
          : and(
              eq(tournamentParticipant.platformId, target.platformId),
              eq(tournamentParticipant.externalUserId, target.externalUserId),
            );

      const withdrawn = await db
        .update(tournamentParticipant)
        .set({ status: "withdrawn", withdrawnAt: new Date() })
        .where(and(eq(tournamentParticipant.tournamentId, current.id), identity))
        .returning({ id: tournamentParticipant.id });

      if (withdrawn.length === 0) throw new NotFoundError("registration not found");
    },

    async listParticipants(
      scope: Scope,
      tournamentId: string,
    ): Promise<ParticipantView[]> {
      await readRow(scope, tournamentId);

      const rows = await db
        .select()
        .from(tournamentParticipant)
        .where(eq(tournamentParticipant.tournamentId, tournamentId))
        .orderBy(
          asc(tournamentParticipant.seed),
          asc(tournamentParticipant.registeredAt),
        );

      return rows.map(toParticipantView);
    },

    async listOpen(scope: Scope, gameId?: string): Promise<TournamentView[]> {
      const rows = await db
        .select()
        .from(tournament)
        .where(
          scopeTo(
            scope,
            tournament,
            eq(tournament.status, "open"),
            gameId === undefined ? undefined : eq(tournament.gameId, gameId),
          ),
        )
        .orderBy(desc(tournament.createdAt));

      return rows.map(toTournamentView);
    },
  };
}
