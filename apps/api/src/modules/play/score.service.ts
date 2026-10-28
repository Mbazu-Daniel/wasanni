import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import {
  ForbiddenError,
  newId,
  NotFoundError,
  isFlagged,
  UnprocessableError,
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
  HidePlayerScoresInput,
  ScoreRow,
  ScoreServiceDeps,
  ScoreSubmitInput,
} from "./types.ts";

const HOUR_MS = 3_600_000;

const HIDE_BATCH_SIZE = 5_000;

const hourBucketOf = (date: Date): Date =>
  new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);

const toView = (row: ScoreRow): ScoreView => ({
  id: row.id,
  organizationId: row.organizationId,
  sessionId: row.sessionId,
  platformId: row.platformId,
  gameId: row.gameId,
  externalUserId: row.externalUserId,
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
    scope: Scope,
    sessionId: string,
    flags: ScoreFlag[],
    submittedAt: Date,
  ): Promise<ScoreRow> => {
    const [existing] = await db
      .select()
      .from(gameSessionScore)
      .where(scopeTo(scope, gameSessionScore, eq(gameSessionScore.sessionId, sessionId)))
      .limit(1);

    if (existing === undefined) throw new NotFoundError("score not found");

    const merged = [...new Set([...existing.flags, ...flags])];

    const [updated] = await db
      .update(gameSessionScore)
      .set({ flags: merged, flagged: isFlagged(merged), updatedAt: submittedAt })
      .where(scopeTo(scope, gameSessionScore, eq(gameSessionScore.id, existing.id)))
      .returning();

    if (updated === undefined) throw new NotFoundError("score not found");

    return updated;
  };

  const submit = async (
    scope: Scope,
    input: ScoreSubmitInput,
    source: ScoreSource,
  ): Promise<ScoreView> => {
    const session = await readGameSessionRow(db, scope, input.platformId, input.sessionId);

    if (session.status === "ended") throw new ForbiddenError("the game session has ended");

    const submittedAt = new Date();
    const flags = readScoreFlags(session, input.body.score, source, submittedAt, false);

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
        signingKeyCiphertext: session.scoreSigningKeyCiphertext,
        signature: input.body.signature ?? null,
        config: session.configSnapshot,
      });

      if (verdict.kind === "failed") {
        await deps.dispatcher
          .dispatch({
            organizationId: session.organizationId,
            platformId: session.platformId,
            eventType: "score.rejected",
            payload: {
              sessionId: session.id,
              externalUserId: session.externalUserId,
              score: input.body.score,
              mode: session.scoreVerificationMode,
              code: verdict.code,
              reason: verdict.reason,
            },
          })
          .catch(() => 0);

        throw new UnprocessableError(verdict.reason, {
          details: { code: verdict.code },
        });
      }

      verificationFlags = verdict.flags;
      verificationStatus = verdict.kind === "passed" ? "passed" : "unavailable";
    }

    const allFlags = [...new Set([...flags, ...verificationFlags])];

    const [inserted] = await db
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
        flagged: isFlagged(allFlags),
        flags: allFlags,
        source,
        verificationStatus,
        submittedAt,
        hourBucket: hourBucketOf(session.startedAt),
      })
      .onConflictDoNothing({
        target: [gameSessionScore.sessionId, gameSessionScore.hourBucket],
      })
      .returning();

    const row =
      inserted ??
      (await mergeIntoExisting(
        scope,
        session.id,
        [
          ...readScoreFlags(session, input.body.score, source, submittedAt, true),
          ...verificationFlags,
        ],
        submittedAt,
      ));

    if (inserted !== undefined && deps.usage !== null) {
      await deps.usage.incr({
        organizationId: session.organizationId,
        platformId: session.platformId,
        metric: "scores_submitted",
      });
    }

    if (input.body.endSession === true) {
      await deps.sessions.endSession(scope, session, submittedAt);
    }

    const view = toView(row);

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

    await deps.dispatcher
      .dispatch({
        organizationId: view.organizationId,
        platformId: view.platformId,
        eventType: "score.submitted",
        payload: view,
      })
      .catch(() => 0);

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
        eq(gameSessionScore.platformId, input.platformId),
        eq(gameSessionScore.externalUserId, input.externalUserId),
        eq(gameSessionScore.status, "accepted"),
        input.gameId === undefined ? undefined : eq(gameSessionScore.gameId, input.gameId),
      );

      let total = 0;

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
          .returning({ id: gameSessionScore.id });

        total += updated.length;

        if (batch.length < HIDE_BATCH_SIZE) break;
      }

      if (total > 0) {
        await deps.dispatcher
          .dispatch({
            organizationId: scope.organizationId,
            platformId: input.platformId,
            eventType: "score.hidden",
            payload: {
              externalUserId: input.externalUserId,
              gameId: input.gameId ?? null,
              hiddenCount: total,
            },
          })
          .catch(() => 0);
      }

      return total;
    },
  };
}
