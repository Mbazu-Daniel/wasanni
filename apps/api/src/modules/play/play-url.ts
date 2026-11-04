import type { ObjectStorage } from "@wasanni/kit";

export type PlayUrlFile = {
  kind: "single" | "bundle";
  objectKey: string;
  entryPoint: string;
  servedPrefix: string | null;
} | null;

export function gamePlayUrl(input: {
  storage: ObjectStorage;
  apiBaseUrl: string;
  platformSlug: string;
  gameSlug: string;
  file: PlayUrlFile;
  tournamentId: string | null;
  matchId: string | null;
  externalUserId: string;
  code: string;
}): string {
  const base =
    input.file === null
      ? `${input.apiBaseUrl.replace(/\/+$/, "")}/s/${input.platformSlug}/${input.gameSlug}/`
      : input.storage.publicUrl(
          input.file.kind === "single"
            ? input.file.objectKey
            : `${input.file.servedPrefix ?? ""}/${input.file.entryPoint}`,
        );

  const query = new URLSearchParams();
  if (input.tournamentId !== null) query.set("tournamentId", input.tournamentId);
  if (input.matchId !== null) query.set("matchId", input.matchId);
  query.set("externalUserId", input.externalUserId);
  query.set("code", input.code);

  return `${base}?${query.toString()}`;
}
