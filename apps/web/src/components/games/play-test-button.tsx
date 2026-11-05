import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Tournament = {
  id: string;
  name: string;
  status: string;
};

type PlayTestResult = {
  sessionId: string;
  joinCode: string;
  playUrl: string;
  realtimeUrl: string;
};

export function PlayTestButton({
  organizationId,
  gameId,
  fileId,
  size = "sm",
}: {
  organizationId: string;
  gameId: string;
  fileId?: string | null;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = React.useState(false);
  const [tournamentId, setTournamentId] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<PlayTestResult | null>(null);

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments", organizationId, gameId],
    queryFn: () =>
      apiFetch<{ tournaments: Tournament[] }>(
        `/api/v1/organizations/${organizationId}/tournaments?gameId=${gameId}`,
      ).then((r) => r.tournaments),
    enabled: open,
  });

  const playable = tournaments.filter((t) => t.status === "open" || t.status === "running");

  async function play() {
    setBusy(true);
    try {
      const { playTest } = await apiFetch<{ playTest: PlayTestResult }>(
        `/api/v1/organizations/${organizationId}/games/${gameId}/play-test`,
        {
          method: "POST",
          data: JSON.stringify({
            ...(fileId === undefined || fileId === null ? {} : { fileId }),
            ...(tournamentId === "" ? {} : { tournamentId }),
            ...(playerName.trim() === "" ? {} : { externalName: playerName.trim() }),
          }),
        },
      );
      setResult(playTest);
      window.open(playTest.playUrl, "_blank", "noopener");
      setOpen(false);
      setTournamentId("");
      setPlayerName("");
      setResult(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the play test");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)} className="gap-1.5">
        <IconPlayerPlay className="size-3.5 fill-current" />
        Play test
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Play test" className="w-[min(92vw,480px)]">
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Tournament</Label>
            <Select
              value={tournamentId}
              onValueChange={setTournamentId}
              placeholder="No tournament — just play"
              options={[
                { value: "", label: "No tournament — just play" },
                ...playable.map((tournament) => ({
                  value: tournament.id,
                  label: `${tournament.name} (${tournament.status})`,
                })),
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Scores count on the chosen tournament's board. No keys leave this page: the
              server opens the session and hands the game a short join code.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="playtest-name">Player name</Label>
            <Input
              id="playtest-name"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Play tester"
              maxLength={200}
            />
          </div>
          {result !== null && (
            <p className="font-mono text-xs text-muted-foreground">
              Join code: {result.joinCode}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={play} disabled={busy}>
              {busy ? "Starting…" : "Play"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
