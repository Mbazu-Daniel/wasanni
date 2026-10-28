import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  replayEnabled: boolean;
};

export function GameSettingsPanel({
  organizationId,
  organizationSlug,
  game,
}: {
  organizationId: string;
  organizationSlug: string;
  game: Game;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = React.useState(game.name);
  const [slug, setSlug] = React.useState(game.slug);
  const [description, setDescription] = React.useState(game.description ?? "");
  const [replayEnabled, setReplayEnabled] = React.useState(game.replayEnabled);
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const dirty =
    name !== game.name ||
    slug !== game.slug ||
    description !== (game.description ?? "") ||
    replayEnabled !== game.replayEnabled;

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/games/${game.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          slug: slugify(slug),
          description: description || null,
          replayEnabled,
        }),
      });
      toast.success("Game updated");
      queryClient.invalidateQueries({ queryKey: ["games", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["game", organizationId] });
      if (slug !== game.slug) {
        navigate({
          to: "/o/$orgSlug/games/$gameSlug",
          params: { orgSlug: organizationSlug, gameSlug: slugify(slug) },
          search: { tab: "settings" },
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame() {
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/games/${game.id}`, {
        method: "DELETE",
      });
      toast.success("Game deleted");
      queryClient.invalidateQueries({ queryKey: ["games", organizationId] });
      navigate({ to: "/o/$orgSlug/games", params: { orgSlug: organizationSlug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <Section title="Basic info">
        <div className="space-y-1.5">
          <Label htmlFor="game-name">Name</Label>
          <Input
            id="game-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-slug">Slug</Label>
          <Input
            id="game-slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Changing the slug breaks existing links.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-description">Description</Label>
          <Textarea
            id="game-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Replays</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Archive session events so replays can be replayed later.
            </p>
          </div>
          <Switch checked={replayEnabled} onCheckedChange={setReplayEnabled} />
        </div>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </Section>

      <Separator />

      <Section
        title="Danger zone"
        description="Deleting a game removes its versions, assignments, configs, and sessions."
      >
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.03] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete this game</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This cannot be undone. Type the game name to confirm.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={game.status === "archived"}
            >
              Delete game
            </Button>
          </div>
        </div>
      </Section>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${game.name}?`}
        description="Every version, assignment, config, and session attached to this game is removed. This cannot be undone."
        confirmPhrase={game.name}
        confirmLabel="Delete game"
        destructive
        busy={deleting}
        onConfirm={deleteGame}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
