import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/primitives/page-header";
import { SecretReveal } from "@/components/primitives/secret-reveal";
import {
  ALL_SCOPES,
  DEFAULT_SCOPES,
  SCOPE_GROUPS,
} from "@/lib/api-key-scopes";
import { permissionsFromScopes } from "@/lib/api-key-permissions";
import {
  DEFAULT_EXPIRY_VALUE,
  EXPIRY_PRESETS,
} from "@/lib/expiry-presets";
import {
  expiryPresetValue,
  secondsForPresetValue,
} from "@/lib/expiry-preset-values";

export const Route = createFileRoute("/$orgSlug/keys/new")({
  head: () => ({ meta: [{ title: "Create an API key · Wasanni" }] }),
  component: NewKeyPage,
});

function NewKeyPage() {
  const { org } = Route.useRouteContext();
  const navigate = useNavigate();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<Set<string>>(new Set(DEFAULT_SCOPES));
  const [expiry, setExpiry] = React.useState<string>(DEFAULT_EXPIRY_VALUE);
  const [busy, setBusy] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);

  function toggleScope(id: string) {
    setScopes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (scopes.size === 0) {
      toast.error("Pick at least one scope");
      return;
    }

    setBusy(true);
    try {
      const { apiKey } = await apiFetch<{ apiKey: { key: string } }>(
        `/api/v1/organizations/${organizationId}/keys`,
        {
          method: "POST",
          data: JSON.stringify({
            name,
            permissions: permissionsFromScopes(scopes),
            expiresInSeconds: secondsForPresetValue(expiry) ?? undefined,
          }),
        },
      );

      setRevealedSecret(apiKey.key);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  }

  if (revealedSecret !== null) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Save your API key" />
        <SecretReveal
          secret={revealedSecret}
          label="API key"
          onAcknowledge={() => setAcknowledged(true)}
        />
        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            disabled={!acknowledged}
            onClick={() => navigate({ to: "/$orgSlug/keys", params: { orgSlug } })}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Create an API key" />

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Scopes</Label>
            <button
              type="button"
              className="text-xs text-blue hover:underline"
              onClick={() =>
                setScopes((current) =>
                  current.size === ALL_SCOPES.length
                    ? new Set(DEFAULT_SCOPES)
                    : new Set(ALL_SCOPES),
                )
              }
            >
              {scopes.size === ALL_SCOPES.length ? "Clear" : "Select all"}
            </button>
          </div>
          {scopes.size === ALL_SCOPES.length && (
            <p className="text-[11px] text-rose-400">
              Every scope: this key acts like an organization owner on API calls.
              Prefer a short expiry. Session and score calls need a platform key.
            </p>
          )}
          <div className="space-y-1 rounded-lg border border-border p-2">
            {SCOPE_GROUPS.map((group) => {
              const picked = group.scopes.filter((scope) => scopes.has(scope)).length;

              return (
                <details key={group.label} className="rounded-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 hover:bg-ink/[0.05] [&::-webkit-details-marker]:hidden">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {picked}/{group.scopes.length} selected
                    </span>
                  </summary>
                  <div className="grid grid-cols-2 gap-1.5 px-1 pb-2 pt-1 sm:grid-cols-3 lg:grid-cols-4">
                    {group.scopes.map((scope) => (
                      <label
                        key={scope}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 hover:bg-ink/[0.05]"
                      >
                        <input
                          type="checkbox"
                          checked={scopes.has(scope)}
                          onChange={() => toggleScope(scope)}
                          className="size-3.5 shrink-0 rounded border-border"
                        />
                        <span className="truncate font-mono text-xs">{scope}</span>
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Expires</Label>
          <Select
            value={expiry}
            onValueChange={setExpiry}
            options={EXPIRY_PRESETS.map((preset) => ({
              value: expiryPresetValue(preset),
              label: preset.label,
            }))}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Link to="/$orgSlug/keys" params={{ orgSlug }}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={busy || !name}>
            {busy ? "Creating…" : "Create key"}
          </Button>
        </div>
      </form>
    </div>
  );
}
