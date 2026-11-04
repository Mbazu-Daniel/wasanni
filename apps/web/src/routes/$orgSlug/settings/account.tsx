import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconBrandGithub,
  IconBrandGoogle,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { toastAuthError } from "@/lib/auth-error";
import { apiFetch } from "@/lib/api-client";
import type { MemberRow } from "@/lib/member-types";
import { AVATAR_TYPES, uploadMemberAvatar } from "@/lib/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/primitives/page-header";

export const Route = createFileRoute("/$orgSlug/settings/account")({
  head: () => ({ meta: [{ title: "Account · Wasanni" }] }),
  component: AccountSettingsPage,
});

function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const { orgSlug } = Route.useParams();
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await authClient.getSession()).data ?? null,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["user-accounts"],
    queryFn: async () => (await authClient.listAccounts()).data ?? [],
  });

  const { data: member } = useQuery({
    queryKey: ["member", organizationId],
    queryFn: () =>
      apiFetch<{ member: MemberRow }>(
        `/api/v1/organizations/${organizationId}/members/me`,
      ).then((response) => response.member),
    enabled: organizationId !== "",
  });

  const user = session?.user;

  const [nameEdit, setNameEdit] = React.useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const avatarInput = React.useRef<HTMLInputElement>(null);

  const name = nameEdit ?? member?.name ?? "";

  const run = async (key: string, action: () => Promise<{ error?: { code?: string | null; message?: string | null; status?: number | null } | null }>) => {
    setBusy(key);
    const { error } = await action();
    setBusy(null);

    if (error) {
      toastAuthError(error, "Something went wrong");
      return false;
    }

    return true;
  };

  const saveName = async () => {
    if (organizationId === "") return;

    setBusy("name");
    try {
      await apiFetch(`/api/v1/organizations/${organizationId}/members/me`, {
        method: "PATCH",
        data: JSON.stringify({ name }),
      });
      toast.success("Name updated");
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["member", organizationId] });
      setNameEdit(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your name");
    } finally {
      setBusy(null);
    }
  };

  const saveAvatar = async (file: File) => {
    if (organizationId === "") return;

    setBusy("avatar");
    try {
      await uploadMemberAvatar(organizationId, file);
      toast.success("Avatar updated");
      queryClient.invalidateQueries({ queryKey: ["member", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["members", organizationId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The avatar upload failed");
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) return;
    const ok = await run("password", () =>
      authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      }),
    );
    if (!ok) return;
    toast.success("Password updated. Other sessions were signed out.");
    setCurrentPassword("");
    setNewPassword("");
    queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
  };

  const link = async (provider: "google" | "github") => {
    await run(`link-${provider}`, () =>
      authClient.linkSocial({
        provider,
        callbackURL: `${window.location.origin}/${orgSlug}/settings/account`,
      }),
    );
  };

  const unlink = async (accountId: string) => {
    const ok = await run(`unlink-${accountId}`, () =>
      authClient.unlinkAccount({ accountId }),
    );
    if (!ok) return;
    toast.success("Account unlinked");
    queryClient.invalidateQueries({ queryKey: ["user-accounts"] });
  };

  const linkedProviders = new Set(accounts.map((account) => account.providerId));

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Account"
      />

      <Section
        title="Profile"
        description={`How you appear in ${org?.name ?? "this workspace"}.`}
      >
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-ink/[0.04] text-base font-semibold">
            {member?.avatar ? (
              <img src={member.avatar} alt="" className="size-full object-cover" />
            ) : (
              (member?.name ?? user?.name ?? "?").slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <input
              ref={avatarInput}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file !== undefined) void saveAvatar(file);
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => avatarInput.current?.click()}
              disabled={busy === "avatar" || organizationId === ""}
            >
              {busy === "avatar" ? "Uploading…" : member?.avatar ? "Change image" : "Choose image"}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              JPEG, PNG, WebP or AVIF. Up to 5 MB.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setNameEdit(event.target.value)}
            maxLength={80}
          />
        </div>
        <Button
          size="sm"
          onClick={saveName}
          disabled={busy === "name" || name === member?.name || name.trim().length === 0}
        >
          {busy === "name" ? "Saving…" : "Save"}
        </Button>
      </Section>

      <Separator className="my-6" />

      <Section
        title="Password"
        description="At least 8 characters. Other sessions are signed out after a change."
      >
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
          />
        </div>
        <Button
          size="sm"
          onClick={savePassword}
          disabled={
            busy === "password" || !currentPassword || !newPassword
          }
        >
          {busy === "password" ? "Updating…" : "Update password"}
        </Button>
      </Section>

      <Separator className="my-6" />

      <Section
        title="Linked accounts"
        description="Sign in with a provider. One account per provider."
      >
        {(["google", "github"] as const).map((provider) => {
          const linked = linkedProviders.has(provider);
          const Icon = provider === "google" ? IconBrandGoogle : IconBrandGithub;

          return (
            <div
              key={provider}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4" />
                <span className="text-sm capitalize">{provider}</span>
                {linked && <Badge variant="success">linked</Badge>}
              </div>
              {linked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const account = accounts.find(
                      (entry) => entry.providerId === provider,
                    );
                    if (account) void unlink(account.id);
                  }}
                >
                  Unlink
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void link(provider)}
                >
                  Link
                </Button>
              )}
            </div>
          );
        })}
      </Section>

    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
