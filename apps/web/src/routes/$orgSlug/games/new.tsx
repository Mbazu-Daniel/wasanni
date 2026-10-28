import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { IconCloud, IconWorld, IconCheck } from "@tabler/icons-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/primitives/page-header";

export const Route = createFileRoute("/$orgSlug/games/new")({
  head: () => ({ meta: [{ title: "New game · Wasanni" }] }),
  component: NewGamePage,
});

function NewGamePage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [hosting, setHosting] = React.useState<"hosted" | "external">("hosted");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { game } = await apiFetch<{ game: { id: string; slug: string } }>(
        `/api/v1/organizations/${organizationId}/games`,
        {
          method: "POST",
          data: JSON.stringify({
            name,
            slug,
            description: description || undefined,
            hosting,
          }),
        },
      );
      toast.success("Game created");
      navigate({
        to: "/$orgSlug/games/$gameSlug",
        params: { orgSlug, gameSlug: game.slug },
        search: { tab: hosting === "hosted" ? "versions" : "overview" },
      });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not create game",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create a game"
      />
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Neon Racer"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => {
                setSlug(slugify(event.target.value));
                setTouchedSlug(true);
              }}
              placeholder="neon-racer"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs and to reference the game on API calls.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A top-down racer where eight players compete for the cup."
              maxLength={1000}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">How is this game hosted?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pick one now. Wasanni cannot convert a game between modes later.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setHosting("hosted")}
              className={cn(
                "relative rounded-xl border-2 p-4 text-left transition-colors",
                hosting === "hosted"
                  ? "border-pink bg-pink/5"
                  : "border-border bg-card/40 hover:border-pink/40",
              )}
            >
              {hosting === "hosted" && (
                <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-pink text-pink-foreground">
                  <IconCheck className="size-3" />
                </span>
              )}
              <IconCloud className="size-5 text-blue" />
              <p className="mt-3 text-sm font-semibold">Hosted by Wasanni</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a Godot, Unity, or HTML5 build. We serve it behind a game
                route and wrap it in a template.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHosting("external")}
              className={cn(
                "relative rounded-xl border-2 p-4 text-left transition-colors",
                hosting === "external"
                  ? "border-pink bg-pink/5"
                  : "border-border bg-card/40 hover:border-pink/40",
              )}
            >
              {hosting === "external" && (
                <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-pink text-pink-foreground">
                  <IconCheck className="size-3" />
                </span>
              )}
              <IconWorld className="size-5 text-cyan" />
              <p className="mt-3 text-sm font-semibold">External (API only)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The game runs on your servers. You create sessions with an API
                key and it talks to Wasanni over the realtime socket.
              </p>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/$orgSlug/games" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={busy || !name || !slug}>
            {busy ? "Creating…" : "Create game"}
          </Button>
        </div>
      </form>
    </div>
  );
}
