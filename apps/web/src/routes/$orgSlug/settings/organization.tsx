import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { toastAuthError } from "@/lib/auth-error";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/primitives/page-header";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

export const Route = createFileRoute("/$orgSlug/settings/organization")({
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
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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
        toastAuthError(error, "Could not update organization");
        return;
      }

      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });

      if (slugify(slug) !== currentSlug) {
        navigate({
          to: "/$orgSlug/settings/organization",
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

  async function deleteOrganization() {
    setDeleting(true);

    try {
      const { error } = await authClient.organization.delete({
        organizationId,
      });

      if (error) {
        toastAuthError(error, "Could not delete organization");
        setDeleting(false);
        return;
      }

      toast.success("Organization deleted");
      queryClient.clear();
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Organization" />

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
              <span className="font-mono">/{slugify(slug)}</span>. Anyone who
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

      <div className="rounded-xl border border-rose-400/30 bg-rose-400/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-300">
            <IconTrash className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-rose-200">
              Delete this organization
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Deletes every game, platform, session, score, tournament, and match
              in this organization. Files in the bucket are not removed
              automatically. This cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => setDeleteOpen(true)}
            >
              Delete organization
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${org.name}?`}
        description="Every row for this organization is removed. Files in storage are not affected. This cannot be undone."
        confirmPhrase={org.slug}
        confirmLabel="Delete organization"
        destructive
        busy={deleting}
        onConfirm={deleteOrganization}
      />
    </div>
  );
}
