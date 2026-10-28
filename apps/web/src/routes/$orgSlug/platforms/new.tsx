import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/primitives/page-header";

export const Route = createFileRoute("/$orgSlug/platforms/new")({
  head: () => ({ meta: [{ title: "Create a platform · Wasanni" }] }),
  component: NewPlatformPage,
});

function NewPlatformPage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      const { platform } = await apiFetch<{
        platform: { id: string; slug: string; name: string };
      }>(`/api/v1/organizations/${organizationId}/platforms`, {
        method: "POST",
        data: JSON.stringify({
          name,
          slug,
          description: description || undefined,
        }),
      });

      toast.success("Platform created");
      navigate({
        to: "/$orgSlug/platforms/$platformSlug",
        params: { orgSlug, platformSlug: platform.slug },
        search: { tab: "overview" },
      });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not create platform",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Create a platform"
      />

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ArcadeHub"
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
            placeholder="arcadehub"
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
          <p className="text-xs text-muted-foreground">
            Used in URLs. Lowercase letters, numbers, and dashes.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Where people play Neon Racer."
            maxLength={500}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Link to="/$orgSlug/platforms" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={busy || !name || !slug}>
            {busy ? "Creating…" : "Create platform"}
          </Button>
        </div>
      </form>
    </div>
  );
}
