import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconTrophy, IconBrackets, IconCheck } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/primitives/page-header";
import type { TournamentFormat, TournamentRow } from "@/lib/tournament-types";

import type {
  GameConfigView,
  GameView,
  OrgAssignmentView,
} from "@/lib/game-types";
import type { PlatformView } from "@/lib/platform-types";

export const Route = createFileRoute("/$orgSlug/tournaments/new")({
  head: () => ({ meta: [{ title: "Create a tournament · Wasanni" }] }),
  component: NewTournamentPage,
});

function NewTournamentPage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [format, setFormat] = React.useState<TournamentFormat>("bracket");
  const [gameId, setGameId] = React.useState("");
  const [assignmentId, setAssignmentId] = React.useState("");
  const [configId, setConfigId] = React.useState("");
  const [maxParticipants, setMaxParticipants] = React.useState("16");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  const { data: games = [] } = useQuery({
    queryKey: ["games", organizationId],
    queryFn: () =>
      apiFetch<{ games: GameView[] }>(
        `/api/v1/organizations/${organizationId}/games`,
      ).then((response) => response.games),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformView[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, gameId],
    queryFn: () =>
      apiFetch<{ assignments: OrgAssignmentView[] }>(
        `/api/v1/organizations/${organizationId}/assignments`,
      ).then((response) => response.assignments),
    enabled: gameId !== "",
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["configs", organizationId, gameId, assignmentId],
    queryFn: () =>
      apiFetch<{ configs: GameConfigView[] }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/assignments/${assignmentId}/configs`,
      ).then((response) => response.configs),
    enabled: gameId !== "" && assignmentId !== "",
  });

  const platformById = new Map(platforms.map((platform) => [platform.id, platform]));
  const forGame = assignments.filter(
    (assignment) => assignment.gameId === gameId && assignment.status === "active",
  );

  function changeGame(next: string) {
    setGameId(next);
    setAssignmentId("");
    setConfigId("");
  }

  function changeAssignment(next: string) {
    setAssignmentId(next);
    setConfigId("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (gameId === "") {
      toast.error("Pick a game");
      return;
    }

    setBusy(true);
    try {
      const { tournament } = await apiFetch<{ tournament: TournamentRow }>(
        `/api/v1/organizations/${organizationId}/tournaments`,
        {
          method: "POST",
          data: JSON.stringify({
            gameId,
            ...(assignmentId === "" ? {} : { assignmentId }),
            ...(configId === "" ? {} : { gameConfigId: configId }),
            name,
            slug,
            ...(description.trim() === "" ? {} : { description: description.trim() }),
            format,
            maxParticipants: maxParticipants === "" ? undefined : Number(maxParticipants),
            ...(startsAt === "" ? {} : { startsAt: new Date(startsAt).toISOString() }),
            ...(endsAt === "" ? {} : { endsAt: new Date(endsAt).toISOString() }),
          }),
        },
      );

      toast.success("Tournament created");
      navigate({
        to: "/$orgSlug/tournaments/$tournamentSlug",
        params: { orgSlug, tournamentSlug: tournament.slug },
        search: { tab: "overview" },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create tournament",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create a tournament"
      />

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Format</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Leaderboard tournaments rank scores. Bracket tournaments advance
              players through matches.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                {
                  value: "leaderboard" as const,
                  label: "Leaderboard",
                  description:
                    "Players submit scores. The best score per player ranks on top.",
                  icon: IconTrophy,
                },
                {
                  value: "bracket" as const,
                  label: "Bracket",
                  description:
                    "Players advance through head-to-head matches. Winners are seated automatically.",
                  icon: IconBrackets,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormat(option.value)}
                className={cn(
                  "relative rounded-xl border-2 p-4 text-left transition-colors",
                  format === option.value
                    ? "border-pink bg-pink/5"
                    : "border-border bg-card/40 hover:border-pink/40",
                )}
              >
                {format === option.value && (
                  <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-pink text-print">
                    <IconCheck className="size-3" />
                  </span>
                )}
                <option.icon className="size-5 text-blue" />
                <p className="mt-3 text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
          <div className="space-y-1.5">
            <Label>Game</Label>
            <Select
              value={gameId}
              onValueChange={changeGame}
              options={games.map((game) => ({ value: game.id, label: game.name }))}
              placeholder="Pick a game"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              value={assignmentId}
              onValueChange={changeAssignment}
              options={forGame.map((assignment) => {
                const platform = platformById.get(assignment.platformId);
                return {
                  value: assignment.id,
                  label: platform?.name ?? assignment.platformId,
                };
              })}
              placeholder={
                gameId === ""
                  ? "Pick a game first"
                  : forGame.length === 0
                    ? "No platforms assigned"
                    : "Pick a platform (optional)"
              }
              disabled={gameId === "" || forGame.length === 0}
            />
            <p className="text-xs text-muted-foreground">
              Optional. The platform is where players come from.
            </p>
          </div>

          {assignmentId !== "" && configs.length > 0 && (
            <div className="space-y-1.5">
              <Label>Config</Label>
              <Select
                value={configId}
                onValueChange={setConfigId}
                options={[
                  {
                    value: "",
                    label:
                      configs.find((config) => config.isDefault)?.name ??
                      "Use the assignment default",
                  },
                  ...configs.map((config) => ({
                    value: config.id,
                    label: `${config.name} (v${config.revision})`,
                  })),
                ]}
                placeholder="Default"
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card/40 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="tournament-name">Name</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring Bracket"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tournament-slug">Slug</Label>
            <Input
              id="tournament-slug"
              value={slug}
              onChange={(event) => {
                setSlug(slugify(event.target.value));
                setTouchedSlug(true);
              }}
              placeholder="spring-bracket"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tournament-description">Description (optional)</Label>
            <Textarea
              id="tournament-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tournament-max">
              Max participants{" "}
              {format === "bracket" && (
                <span className="text-muted-foreground">(2 to 256)</span>
              )}
            </Label>
            <Input
              id="tournament-max"
              type="number"
              min={2}
              max={256}
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tournament-starts">Starts (optional)</Label>
              <Input
                id="tournament-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tournament-ends">Ends (optional)</Label>
              <Input
                id="tournament-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/$orgSlug/tournaments" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={busy || !name || !slug || gameId === ""}>
            {busy ? "Creating…" : "Create tournament"}
          </Button>
        </div>
      </form>
    </div>
  );
}
