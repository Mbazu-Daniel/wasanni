import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconCloud, IconWorld, IconCheck, IconPhoto } from "@tabler/icons-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { uploadImage } from "@/lib/image-upload";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/primitives/page-header";
import { ImagePicker } from "@/components/primitives/image-picker";
import { HintsEditor } from "@/components/games/hints-editor";

export const Route = createFileRoute("/$orgSlug/games/new")({
  head: () => ({ meta: [{ title: "New game · Wasanni" }] }),
  component: NewGamePage,
});

function NewGamePage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [hints, setHints] = React.useState<string[]>([]);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [hosting, setHosting] = React.useState<"hosted" | "external">("hosted");
  const [busy, setBusy] = React.useState(false);

  const effectiveSlug = touchedSlug ? slug : slugify(name);
  const imagePreview = React.useMemo(
    () => (imageFile === null ? null : URL.createObjectURL(imageFile)),
    [imageFile],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const cleanHints = hints.map((hint) => hint.trim()).filter((hint) => hint !== "");
      const { game } = await apiFetch<{ game: { id: string; slug: string } }>(
        `/api/v1/organizations/${organizationId}/games`,
        {
          method: "POST",
          data: JSON.stringify({
            name,
            slug: effectiveSlug,
            description: description || undefined,
            hints: cleanHints.length > 0 ? cleanHints : undefined,
            hosting,
          }),
        },
      );
      if (imageFile !== null) {
        const image = `/api/v1/organizations/${organizationId}/games/${game.id}/image`;
        await uploadImage(image, image, imageFile);
      }
      toast.success("Game created");
      await queryClient.invalidateQueries({
        queryKey: ["games", organizationId],
        refetchType: "all",
      });
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

  const rows = [
    { label: "Name", value: name },
    { label: "Slug", value: effectiveSlug },
    {
      label: "Hosting",
      value: hosting === "hosted" ? "Hosted by Wasanni" : "External (API only)",
    },
    { label: "Description", value: description },
    {
      label: "Hints",
      value: hints.some((hint) => hint.trim() !== "")
        ? `${hints.filter((hint) => hint.trim() !== "").length} written`
        : "",
    },
    { label: "Image", value: imageFile === null ? "" : "Chosen" },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Create a game"
          actions={
            <div className="flex items-center gap-2">
              <Link to="/$orgSlug/games" params={{ orgSlug }}>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                form="new-game-form"
                disabled={busy || !name || !effectiveSlug}
              >
                {busy ? "Creating…" : "Create game"}
              </Button>
            </div>
          }
        />

        <form id="new-game-form" onSubmit={submit} className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
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
                  value={effectiveSlug}
                  onChange={(event) => {
                    setSlug(slugify(event.target.value));
                    setTouchedSlug(true);
                  }}
                  placeholder="neon-racer"
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The slug is used in URLs and to reference the game on API calls.
            </p>

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

            <div className="space-y-1.5">
              <Label>Cover image (optional)</Label>
              <ImagePicker
                imageUrl={imagePreview}
                onPick={async (file) => setImageFile(file)}
                onRemove={
                  imageFile === null
                    ? undefined
                    : async () => setImageFile(null)
                }
                fallback={<IconPhoto className="size-6 text-muted-foreground" />}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Hints (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Short tips players see before and between rounds: controls,
                tricks, what to watch out for.
              </p>
              <HintsEditor value={hints} onChange={setHints} />
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
        </form>
      </div>

      <aside className="self-start rounded-xl border border-border bg-card/40 p-5 lg:sticky lg:top-6">
        <p className="text-sm font-semibold">Summary</p>
        <dl className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="truncate text-right font-medium">
                {row.value === "" ? "Not set" : row.value}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
