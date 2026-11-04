import { and, eq, inArray } from "drizzle-orm";
import type { Db, DbExecutor } from "@wasanni/db";
import { gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  ForbiddenError,
  newId,
  NotFoundError,
  isFlagged,
  decryptSecret,
  readGameConfig,
} from "@wasanni/kit";
import type {
  ScoreFlag,
  ScoreSource,
  ScoreVerificationStatus,
  ScoreView,
} from "@wasanni/contracts";
import { readGameSessionRow } from "./session.service.ts";
import { readScoreFlags } from "./score-flags.ts";
import type {
  GameSessionRow,
  HidePlayerScoresInput,
  ScoreRow,
  ScoreServiceDeps,
  ScoreSubmitInput,
} from "./types.ts";

const HOUR_MS = 3_600_000;

const HIDE_BATCH_SIZE = 5_000;

const hourBucketOf = (date: Date): Date =>
  new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);

const toView = (row: ScoreRow, externalName: string | null): ScoreView => ({
  id: row.id,
  organizationId: row.organizationId,
  sessionId: row.sessionId,
  platformId: row.platformId,
  gameId: row.gameId,
  externalUserId: row.externalUserId,
  externalName,
  mode: row.mode,
  score: row.score,
  status: row.status,
  flagged: row.flagged,
  flags: row.flags,
  source: row.source,
  verificationStatus: row.verificationStatus,
  submittedAt: row.submittedAt.toISOString(),
});

export function createScoreService(db: Db, deps: ScoreServiceDeps) {
  const mergeIntoExisting = async (
    executor: DbExecutor,
    input: {
      scope: Scope;
      sessionId: string;
      flags: ScoreFlag[];
      submittedAt: Date;
    },
  ): Promise<ScoreRow> => {
    const [existing] = await executor
      .select()
      .from(gameSessionScore)
      .where(
        scopeTo(input.scope, gameSessionScore, eq(gameSessionScore.sessionId, input.sessionId)),
      )
      .limit(1);

    if (existing === undefined) throw new NotFoundError("score not found");

    const merged = [...new Set([...existing.flags, ...input.flags])];

    const [updated] = await executor
      .update(gameSessionScore)
      .set({ flags: merged, flagged: isFlagged(merged), updatedAt: input.submittedAt })
      .where(scopeTo(input.scope, gameSessionScore, eq(gameSessionScore.id, existing.id)))
      .returning();

    if (updated === undefined) throw new NotFoundError("score not found");

    return updated;
  };

  const commitScore = (
    args: {
      scope: Scope;
      session: GameSessionRow;
      input: ScoreSubmitInput;
      source: ScoreSource;
      submittedAt: Date;
      verificationFlags: ScoreFlag[];
      verificationStatus: ScoreVerificationStatus;
    },
  ): Promise<{ row: ScoreRow; inserted: boolean }> =>
    db.transaction(async (tx) => {
      const { session, input, source, submittedAt, verificationFlags, verificationStatus, scope } =
        args;
      const insertFlags = [
        ...new Set([
          ...readScoreFlags(session, input.body.score, source, submittedAt, false),
          ...verificationFlags,
        ]),
      ];

      const [fresh] = await tx
        .insert(gameSessionScore)
        .values({
          id: newId(),
          organizationId: session.organizationId,
          sessionId: session.id,
          platformId: session.platformId,
          gameId: session.gameId,
          externalUserId: session.externalUserId,
          mode: session.mode,
          score: input.body.score,
          status: "accepted",
          flagged: isFlagged(insertFlags),
          flags: insertFlags,
          source,
          verificationStatus,
          submittedAt,
          hourBucket: hourBucketOf(session.startedAt),
        })
        .onConflictDoNothing({
          target: [gameSessionScore.sessionId, gameSessionScore.hourBucket],
        })
        .returning();

      const scoreRow =
        fresh ??
        (await mergeIntoExisting(tx, {
          scope,
          sessionId: session.id,
          flags: [
            ...readScoreFlags(session, input.body.score, source, submittedAt, true),
            ...verificationFlags,
          ],
          submittedAt,
        }));

      await deps.dispatcher.dispatch(
        {
          organizationId: scoreRow.organizationId,
          platformId: scoreRow.platformId,
          eventType: "score.submitted",
          payload: toView(scoreRow, session.externalName),
        },
        tx,
      );

      return { row: scoreRow, inserted: fresh !== undefined };
    });

  const submit = async (
    scope: Scope,
    input: ScoreSubmitInput,
    source: ScoreSource,
  ): Promise<ScoreView> => {
    const session = await readGameSessionRow(db, scope, input.sessionId);
    const submittedAt = new Date();

    if (session.status === "ended") throw new ForbiddenError("the game session has ended");

    if (session.status === "expired") {
      await deps.dispatcher
        .dispatch({
          organizationId: session.organizationId,
          platformId: session.platformId,
          eventType: "score.expired",
          payload: {
            sessionId: session.id,
            gameId: session.gameId,
            externalUserId: session.externalUserId,
            score: null,
            attemptedScore: input.body.score,
            reason: "session_expired",
            expiresAt: session.expiresAt.toISOString(),
            submittedAt: submittedAt.toISOString(),
          },
        })
        .catch(() => undefined);

      throw new ForbiddenError("the game session has expired");
    }

    let verificationFlags: ScoreFlag[] = [];
    let verificationStatus: ScoreVerificationStatus = "not_required";

    if (source === "client" && session.scoreVerificationMode !== "none" && deps.verifier !== null) {
      const verdict = await deps.verifier.verify({
        sessionId: session.id,
        organizationId: session.organizationId,
        externalUserId: session.externalUserId,
        score: input.body.score,
        mode: session.scoreVerificationMode,
        submittedAt,
        config: session.configSnapshot,
        callbackSecret: session.scoreVerificationCallbackSecretCiphertext === null
          ? readGameConfig(session.configSnapshot).callback?.secret ?? null
          : decryptSecret(session.scoreVerificationCallbackSecretCiphertext, deps.encryptionKey),
      });

      if (verdict.kind === "failed") {
        verificationFlags = ["verification_failed"];
        verificationStatus = "failed";
      }

      if (verdict.kind !== "failed") {
        verificationFlags = verdict.flags;
        verificationStatus = verdict.kind === "passed" ? "passed" : "unavailable";
      }
    }

    const { row, inserted } = await commitScore({
      scope,
      session,
      input,
      source,
      submittedAt,
      verificationFlags,
      verificationStatus,
    });

    if (inserted && deps.usage !== null) {
      await deps.usage.incr({
        organizationId: session.organizationId,
        platformId: session.platformId,
        metric: "scores_submitted",
      });
    }

    if (input.body.endSession === true) {
      await deps.sessions.endSession(scope, session, submittedAt);
    }

    const view = toView(row, session.externalName);

    const recorder = deps.matchRecorder;
    if (recorder !== undefined && session.matchId !== null) {
      await recorder
        .recordParticipantScore(scope, {
          matchId: session.matchId,
          platformId: session.platformId,
          externalUserId: session.externalUserId,
          sessionId: session.id,
          score: row.score,
        })
        .catch(() => undefined);
    }

    return view;
  };

  return {
    submitFromClient(scope: Scope, input: ScoreSubmitInput): Promise<ScoreView> {
      return submit(scope, input, "client");
    },

    submitFromServer(scope: Scope, input: ScoreSubmitInput): Promise<ScoreView> {
      return submit(scope, input, "server");
    },

    async hideForPlayer(scope: Scope, input: HidePlayerScoresInput): Promise<number> {
      const conditions = scopeTo(
        scope,
        gameSessionScore,
        eq(gameSessionScore.externalUserId, input.externalUserId),
        eq(gameSessionScore.status, "accepted"),
        input.gameId === undefined ? undefined : eq(gameSessionScore.gameId, input.gameId),
        input.platformId === undefined ? undefined : eq(gameSessionScore.platformId, input.platformId),
      );

      const hiddenByPlatform = new Map<string, number>();

      for (;;) {
        const batch = await db
          .select({ id: gameSessionScore.id })
          .from(gameSessionScore)
          .where(conditions)
          .limit(HIDE_BATCH_SIZE);

        if (batch.length === 0) break;

        const updated = await db
          .update(gameSessionScore)
          .set({ status: "hidden", updatedAt: new Date() })
          .where(
            and(
              conditions,
              inArray(
                gameSessionScore.id,
                batch.map((row) => row.id),
              ),
            ),
          )
          .returning({ id: gameSessionScore.id, platformId: gameSessionScore.platformId });

        for (const row of updated) {
          hiddenByPlatform.set(
            row.platformId,
            (hiddenByPlatform.get(row.platformId) ?? 0) + 1,
          );
        }

        if (batch.length < HIDE_BATCH_SIZE) break;
      }

      const total = [...hiddenByPlatform.values()].reduce((sum, count) => sum + count, 0);

      if (total > 0) {
        for (const [platformId, hiddenCount] of hiddenByPlatform) {
          await deps.dispatcher
            .dispatch({
              organizationId: scope.organizationId,
              platformId,
              eventType: "score.hidden",
              payload: {
                externalUserId: input.externalUserId,
                gameId: input.gameId ?? null,
                hiddenCount,
              },
            })
            .catch(() => undefined);
        }
      }

      return total;
    },
  };
}
