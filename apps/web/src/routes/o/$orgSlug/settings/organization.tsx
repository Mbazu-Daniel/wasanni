import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/primitives/page-header";

export const Route = createFileRoute("/o/$orgSlug/settings/organization")({
  head: () => ({ meta: [{ title: "Organization · Wasanni" }] }),
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const organizationId = org?.id ?? "";
  const currentSlug = org?.slug ?? "";
  const [name, setName] = React.useState(org?.name ?? "");
  const [slug, setSlug] = React.useState(org?.slug ?? "");
  const [saving, setSaving] = React.useState(false);

  if (org === null) return null;

  const canSave = name !== org.name || slug !== org.slug;

  async function save() {
    setSaving(true);

    try {
      const { error } = await authClient.organization.update({
        organizationId,
        data: { name, slug: slugify(slug) },
      });

      if (error) {
        toast.error(error.message ?? "Could not update organization");
        return;
      }

      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });

      if (slugify(slug) !== currentSlug) {
        navigate({
          to: "/o/$orgSlug/settings/organization",
          params: { orgSlug: slugify(slug) },
          replace: true,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Organization"
        description="The name and slug used across Wasanni."
      />

      <div className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-slug">Slug</Label>
          <Input
            id="org-slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
          <p className="text-xs text-muted-foreground">
            Used in every URL. Changing it breaks shared links.
          </p>
        </div>

        {slug !== org.slug && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-3 py-2.5 text-xs text-amber-100">
            <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            <p>
              After saving, you will be redirected to{" "}
              <span className="font-mono">/o/{slugify(slug)}</span>. Anyone who
              bookmarked the old URL will need the new one.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !canSave || !name || !slug}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      <div>
        <h2 className="text-sm font-semibold">About this organization</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <dt className="text-xs text-muted-foreground">Organization ID</dt>
            <dd className="font-mono text-xs">{org.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
