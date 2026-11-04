import { eq } from "drizzle-orm";
import type { Db } from "@wasanni/db";
import { scopeTo } from "@wasanni/db";
import { tournament } from "@wasanni/db/schema";
import type { ObjectStorage, Scope } from "@wasanni/kit";
import { NotFoundError } from "@wasanni/kit";
import {
  ImageUploadTicketSingle,
  PERMISSION,
  RequestImageUpload,
  SetImage,
  TournamentIdParams,
  TournamentSingle,
} from "@wasanni/contracts";
import { organizationScope } from "@wasanni/kit";
import type { PrincipalApi } from "../../plugins/types.ts";
import { assertImageKey, createImageUploadTicket } from "../image/index.ts";
import { toTournamentView } from "./views.ts";
import type { TournamentRow } from "./types.ts";

const readRow = async (
  db: Db,
  scope: Scope,
  tournamentId: string,
): Promise<TournamentRow> => {
  const [row] = await db
    .select()
    .from(tournament)
    .where(scopeTo(scope, tournament, eq(tournament.id, tournamentId)))
    .limit(1);

  if (row === undefined) throw new NotFoundError("tournament not found");
  return row;
};

export const createTournamentImageRoutes = <T extends PrincipalApi>(
  api: T,
  deps: { db: Db; storage: ObjectStorage },
) => {
  const { db, storage } = deps;

  return api
    .post(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/image",
      async ({ principal, params, body, status }) => {
        const scope = organizationScope(principal);
        await readRow(db, scope, params.tournamentId);

        return status(201, {
          upload: await createImageUploadTicket(
            storage,
            scope.organizationId,
            "tournaments",
            body.contentType,
          ),
        });
      },
      {
        organizationAuth: PERMISSION.tournamentUpdate,
        params: TournamentIdParams,
        body: RequestImageUpload,
        response: { 201: ImageUploadTicketSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Request a presigned url to upload this tournament's image",
        },
      },
    )
    .put(
      "/api/v1/organizations/:organizationId/tournaments/:tournamentId/image",
      async ({ principal, params, body }) => {
        const scope = organizationScope(principal);
        assertImageKey(body.key, scope.organizationId, "tournaments");

        const [row] = await db
          .update(tournament)
          .set({ imageUrl: storage.publicUrl(body.key), updatedAt: new Date() })
          .where(
            scopeTo(scope, tournament, eq(tournament.id, params.tournamentId)),
          )
          .returning();

        if (row === undefined) throw new NotFoundError("tournament not found");
        return { tournament: toTournamentView(row) };
      },
      {
        organizationAuth: PERMISSION.tournamentUpdate,
        params: TournamentIdParams,
        body: SetImage,
        response: { 200: TournamentSingle },
        detail: {
          tags: ["tournaments"],
          summary: "Attach an uploaded tournament image",
        },
      },
    );
};
