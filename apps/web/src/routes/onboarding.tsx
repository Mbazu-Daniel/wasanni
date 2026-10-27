import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create an organization · Wasanni" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.organization.create({ name, slug });
    setBusy(false);
    if (error || data === null) {
      toast.error(error?.message ?? "Could not create organization");
      return;
    }

    queryClient.setQueryData<{ id: string; name: string; slug: string }[]>(
      ["organizations"],
      (current = []) => [
        ...current.filter((org) => org.id !== data.id),
        { id: data.id, name: data.name, slug: data.slug },
      ],
    );

    localStorage.setItem("wasanni:last-org", data.slug);
    navigate({ to: "/o/$orgSlug/overview", params: { orgSlug: data.slug } });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Step 1 of 1
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Create your organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An organization is your team. Every game, platform, and session lives
          inside one.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pixel Forge"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setTouchedSlug(true);
              }}
              placeholder="pixel-forge"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs. You can change it later.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !name || !slug}
          >
            {busy ? "Creating…" : "Create organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}
