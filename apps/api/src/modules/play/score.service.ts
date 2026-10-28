import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { gameSessionScore } from "@wasanni/db/schema";
import { scopeTo } from "@wasanni/db";
import type { Scope } from "@wasanni/kit";
import { forbidden, newId, notFound, isFlagged } from "@wasanni/kit";
import type { ScoreFlag, ScoreSource, ScoreView } from "@wasanni/contracts";
import { readGameSessionRow } from "./session.service.ts";
import { readScoreFlags } from "./score-flags.ts";
import type {
  HidePlayerScoresInput,
  ScoreRow,
  ScoreServiceDeps,
  ScoreSubmitInput,
} from "./types.ts";

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

    if (existing === undefined) throw notFound("score not found");

    const merged = [...new Set([...existing.flags, ...flags])];

    const [updated] = await db
      .update(gameSessionScore)
      .set({ flags: merged, flagged: isFlagged(merged), updatedAt: submittedAt })
      .where(scopeTo(scope, gameSessionScore, eq(gameSessionScore.id, existing.id)))
      .returning();

    if (updated === undefined) throw notFound("score not found");

    return updated;
  };

  const submit = async (
    scope: Scope,
    input: ScoreSubmitInput,
    source: ScoreSource,
  ): Promise<ScoreView> => {
    const session = await readGameSessionRow(db, scope, input.platformId, input.sessionId);

    if (session.status === "ended") throw forbidden("the game session has ended");

    const submittedAt = new Date();
    const flags = readScoreFlags(session, input.body.score, source, submittedAt, false);

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
        flagged: isFlagged(flags),
        flags,
        source,
        submittedAt,
      })
      .onConflictDoNothing({ target: gameSessionScore.sessionId })
      .returning();

    const row =
      inserted ??
      (await mergeIntoExisting(
        scope,
        session.id,
        readScoreFlags(session, input.body.score, source, submittedAt, true),
        submittedAt,
      ));

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
      const hidden = await db
        .update(gameSessionScore)
        .set({ status: "hidden", updatedAt: new Date() })
        .where(
          scopeTo(
            scope,
            gameSessionScore,
            eq(gameSessionScore.platformId, input.platformId),
            eq(gameSessionScore.externalUserId, input.externalUserId),
            input.gameId === undefined ? undefined : eq(gameSessionScore.gameId, input.gameId),
          ),
        )
        .returning({ id: gameSessionScore.id });

      if (hidden.length > 0) {
        await deps.dispatcher
          .dispatch({
            organizationId: scope.organizationId,
            platformId: input.platformId,
            eventType: "score.hidden",
            payload: {
              externalUserId: input.externalUserId,
              gameId: input.gameId ?? null,
              hiddenCount: hidden.length,
            },
          })
          .catch(() => 0);
      }

      return hidden.length;
    },
  };
}
