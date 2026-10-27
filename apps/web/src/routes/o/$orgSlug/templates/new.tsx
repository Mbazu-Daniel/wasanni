import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { IconLayoutGrid, IconTrophy } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/primitives/page-header";

const KINDS = [
  {
    value: "game" as const,
    label: "Game page",
    description: "Wraps the game canvas with your branding, HUD, and controls.",
    icon: IconLayoutGrid,
  },
  {
    value: "tournament" as const,
    label: "Tournament page",
    description: "Shows standings or a bracket with your look.",
    icon: IconTrophy,
  },
];

export const Route = createFileRoute("/o/$orgSlug/templates/new")({
  head: () => ({ meta: [{ title: "Create a template · Wasanni" }] }),
  component: NewTemplatePage,
});

function NewTemplatePage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [touchedSlug, setTouchedSlug] = React.useState(false);
  const [kind, setKind] = React.useState<"game" | "tournament">("game");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      const { template } = await apiFetch<{ template: { id: string; slug: string } }>(
        `/api/v1/organizations/${organizationId}/templates`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            slug,
            kind,
            description: description || undefined,
          }),
        },
      );

      toast.success("Template created");
      navigate({
        to: "/o/$orgSlug/templates/$templateId",
        params: { orgSlug, templateId: template.id },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create template",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create a template"
        description="You can upload the bundle right after creating."
      />

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Arcade frame"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-slug">Slug</Label>
            <Input
              id="template-slug"
              value={slug}
              onChange={(event) => {
                setSlug(slugify(event.target.value));
                setTouchedSlug(true);
              }}
              placeholder="arcade-frame"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Template kind</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A template can only be used for one kind of page.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  kind === option.value
                    ? "border-pink bg-pink/5"
                    : "border-border bg-card/40 hover:border-pink/40",
                )}
              >
                <option.icon className="size-5 text-blue-soft" />
                <p className="mt-3 text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/o/$orgSlug/templates" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={busy || !name || !slug}>
            {busy ? "Creating…" : "Create template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
