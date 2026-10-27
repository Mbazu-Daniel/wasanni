import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconPlus, IconUsers, IconX } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/primitives/page-header";
import type { TournamentRow } from "@/lib/tournament-types";

type GameOption = { id: string; name: string; slug: string };
type PlatformOption = { id: string; name: string; slug: string };
type Assignment = { id: string; platformId: string; status: "active" | "disabled" };

type ParticipantInput = {
  key: string;
  platformId: string;
  externalUserId: string;
  displayName: string;
};

const ELIGIBLE_TOURNAMENT_STATUSES = new Set(["open", "running"]);

export const Route = createFileRoute("/o/$orgSlug/matches/new")({
  head: () => ({ meta: [{ title: "New match · Wasanni" }] }),
  component: NewMatchPage,
});

function NewMatchPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";
  const navigate = useNavigate();

  const [gameId, setGameId] = React.useState("");
  const [tournamentId, setTournamentId] = React.useState("");
  const [name, setName] = React.useState("");
  const [participants, setParticipants] = React.useState<ParticipantInput[]>([]);
  const [busy, setBusy] = React.useState(false);

  const [newPlatformId, setNewPlatformId] = React.useState("");
  const [newExternalUserId, setNewExternalUserId] = React.useState("");
  const [newDisplayName, setNewDisplayName] = React.useState("");

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameOption[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((r) => r.games),
    enabled: org !== null,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformOption[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((r) => r.platforms),
    enabled: org !== null,
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", organizationId],
    queryFn: () =>
      apiFetch<{ tournaments: TournamentRow[] }>(
        `/api/v1/organizations/${organizationId}/tournaments`,
      ).then((r) => r.tournaments),
    enabled: org !== null,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, gameId],
    queryFn: () =>
      apiFetch<{ assignments: Assignment[] }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments`,
      ).then((r) => r.assignments),
    enabled: org !== null && gameId !== "",
  });

  const platformById = new Map(platforms.map((entry) => [entry.id, entry]));

  const availablePlatforms = assignments
    .filter((assignment) => assignment.status === "active")
    .map((assignment) => platformById.get(assignment.platformId))
    .filter((entry): entry is PlatformOption => entry !== undefined);

  const eligibleTournaments = tournaments.filter(
    (tournament) =>
      tournament.gameId === gameId &&
      ELIGIBLE_TOURNAMENT_STATUSES.has(tournament.status),
  );

  React.useEffect(() => {
    if (availablePlatforms.length === 1 && newPlatformId === "") {
      setNewPlatformId(availablePlatforms[0]!.id);
    }
  }, [availablePlatforms, newPlatformId]);

  function addParticipant() {
    const externalUserId = newExternalUserId.trim();

    if (newPlatformId === "" || externalUserId === "") {
      toast.error("Pick a platform and type the player's external ID");
      return;
    }

    const key = `${newPlatformId}:${externalUserId}`;
    if (participants.some((entry) => entry.key === key)) {
      toast.error("That player is already in this match");
      return;
    }

    setParticipants((prev) => [
      ...prev,
      {
        key,
        platformId: newPlatformId,
        externalUserId,
        displayName: newDisplayName.trim(),
      },
    ]);
    setNewExternalUserId("");
    setNewDisplayName("");
  }

  function removeParticipant(key: string) {
    setParticipants((prev) => prev.filter((entry) => entry.key !== key));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (gameId === "") {
      toast.error("Pick a game");
      return;
    }

    if (participants.length < 2) {
      toast.error("A match needs at least 2 participants");
      return;
    }

    setBusy(true);

    try {
      const created = await apiFetch<{ match: { id: string } }>(
        `/api/v1/organizations/${organizationId}/matches`,
        {
          method: "POST",
          body: JSON.stringify({
            gameId,
            ...(tournamentId === "" ? {} : { tournamentId }),
            ...(name.trim() === "" ? {} : { name: name.trim() }),
            participants: participants.map((participant) => ({
              platformId: participant.platformId,
              externalUserId: participant.externalUserId,
              ...(participant.displayName === ""
                ? {}
                : { displayName: participant.displayName }),
            })),
          }),
        },
      );

      toast.success("Match created");
      navigate({
        to: "/o/$orgSlug/matches/$matchId",
        params: { orgSlug, matchId: created.match.id },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the match");
    } finally {
      setBusy(false);
    }
  }

  if (org === null) {
    return <div className="h-40 animate-pulse rounded-xl bg-card/40" />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Create a match"
        description="A match groups sessions from multiple players. Standalone matches do not need a tournament."
      />

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="match-game">Game</Label>
            <Select
              value={gameId}
              onValueChange={(value) => {
                setGameId(value);
                setTournamentId("");
                setParticipants([]);
                setNewPlatformId("");
              }}
              options={games.map((entry) => ({ value: entry.id, label: entry.name }))}
              placeholder="Pick a game"
            />
          </div>

          {gameId !== "" && eligibleTournaments.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="match-tournament">Tournament</Label>
              <Select
                value={tournamentId}
                onValueChange={setTournamentId}
                options={[
                  { value: "", label: "Standalone match" },
                  ...eligibleTournaments.map((tournament) => ({
                    value: tournament.id,
                    label: `${tournament.name} (${tournament.status})`,
                  })),
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Only open or running tournaments are eligible.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="match-name">Name</Label>
            <Input
              id="match-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Grand final"
              maxLength={120}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            The match completes on its own once every participant has a score.
          </p>
        </div>

        {gameId !== "" && (
          <div className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
            <div>
              <p className="text-sm font-semibold">
                Participants ({participants.length})
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                At least 2, up to 64. Duplicate player on the same platform is
                rejected.
              </p>
            </div>

            {participants.length > 0 && (
              <div className="space-y-1.5">
                {participants.map((participant) => (
                  <div
                    key={participant.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <IconUsers className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {participant.displayName || participant.externalUserId}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {platformById.get(participant.platformId)?.name ??
                            participant.platformId}{" "}
                          · {participant.externalUserId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.key)}
                      aria-label="Remove participant"
                      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-white/[0.05] hover:text-rose-300"
                    >
                      <IconX className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Add participant
              </p>

              {availablePlatforms.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This game has no active platform. Assign it to a platform first.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={newPlatformId}
                      onValueChange={setNewPlatformId}
                      options={availablePlatforms.map((entry) => ({
                        value: entry.id,
                        label: entry.name,
                      }))}
                      placeholder="Platform"
                    />
                    <Input
                      value={newExternalUserId}
                      onChange={(event) => setNewExternalUserId(event.target.value)}
                      placeholder="External user ID (e.g. u_552)"
                      maxLength={200}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={newDisplayName}
                      onChange={(event) => setNewDisplayName(event.target.value)}
                      placeholder="Display name"
                      maxLength={200}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addParticipant}
                      disabled={newPlatformId === "" || newExternalUserId.trim() === ""}
                      className="gap-1.5"
                    >
                      <IconPlus className="size-3.5" />
                      Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Link to="/o/$orgSlug/matches" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={busy || gameId === "" || participants.length < 2}
          >
            {busy ? "Creating…" : "Create match"}
          </Button>
        </div>
      </form>
    </div>
  );
}
