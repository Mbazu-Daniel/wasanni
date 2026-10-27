import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  IconCloud,
  IconWorld,
  IconArchive,
  IconPlayerPlay,
  IconTrophy,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/primitives/status-pill";
import { PlayButton } from "./play-button";

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hosting: "hosted" | "external";
  status: "draft" | "active" | "archived";
  replayEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Version = {
  id: string;
  version: string;
  status: "pending_upload" | "extracting" | "ready" | "failed";
  isCurrent: boolean;
  sizeBytes: number;
  kind: "single" | "bundle";
  createdAt: string;
};

type Assignment = {
  id: string;
  platformId: string;
  status: "active" | "disabled";
};

export function GameOverviewPanel({
  organizationId,
  organizationSlug,
  game,
}: {
  organizationId: string;
  organizationSlug: string;
  game: Game;
}) {
  const { data: versions = [] } = useQuery({
    queryKey: ["versions", organizationId, game.id],
    queryFn: () =>
      apiFetch<{ files: Version[] }>(
        `/api/v1/organizations/${organizationId}/games/${game.id}/files`,
      ).then((r) => r.files),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", organizationId, game.id],
    queryFn: () =>
      apiFetch<{ assignments: Assignment[] }>(
        `/api/v1/organizations/${organizationId}/games/${game.id}/assignments`,
      ).then((r) => r.assignments),
  });

  const current = versions.find((v) => v.isCurrent && v.status === "ready");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Hosting</p>
          <div className="mt-2 flex items-center gap-2">
            {game.hosting === "hosted" ? (
              <IconCloud className="size-4 text-blue-soft" />
            ) : (
              <IconWorld className="size-4 text-cyan" />
            )}
            <p className="text-sm font-medium">
              {game.hosting === "hosted" ? "Wasanni" : "External"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            <StatusPill status={game.status} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Assigned platforms</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            {assignments.filter((a) => a.status === "active").length}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Current version</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {game.hosting === "hosted"
                ? "The build Wasanni serves when a session is created."
                : "External games have no uploaded build."}
            </p>
          </div>
          {game.hosting === "hosted" && (
            <Link
              to="/o/$orgSlug/games/$gameSlug"
              params={{ orgSlug: organizationSlug, gameSlug: game.slug }}
              search={{ tab: "versions" }}
            >
              <Button variant="outline" size="sm">
                Manage versions
              </Button>
            </Link>
          )}
        </div>

        <div className="p-5">
          {game.hosting === "external" ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              <IconWorld className="size-4" />
              The game runs on your servers. Nothing to serve from Wasanni.
            </div>
          ) : current ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    v{current.version}
                  </span>
                  <Badge variant="success">current</Badge>
                  <Badge variant="muted">{current.kind}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Uploaded {formatDateTime(current.createdAt)}
                </p>
              </div>
              <PlayButton
                gameId={game.id}
                fileId={current.id}
                hosting={game.hosting}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-6">
              <div>
                <p className="text-sm font-medium">No ready build yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Upload a Godot, Unity, or HTML5 build to make this game playable.
                </p>
              </div>
              <Link
                to="/o/$orgSlug/games/$gameSlug"
                params={{ orgSlug: organizationSlug, gameSlug: game.slug }}
                search={{ tab: "versions" }}
              >
                <Button size="sm">Upload build</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2">
            <IconPlayerPlay className="size-4 text-blue-soft" />
            <p className="text-xs text-muted-foreground">Replays</p>
          </div>
          <p className="mt-2 text-sm font-medium">
            {game.replayEnabled ? "Enabled" : "Disabled"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {game.replayEnabled
              ? "Session events are archived to R2 after they end."
              : "Events are not stored beyond the live session."}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2">
            {game.status === "archived" ? (
              <IconArchive className="size-4 text-muted-foreground" />
            ) : (
              <IconTrophy className="size-4 text-pink" />
            )}
            <p className="text-xs text-muted-foreground">Created</p>
          </div>
          <p className="mt-2 text-sm font-medium">
            {formatDateTime(game.createdAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated {formatDateTime(game.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
