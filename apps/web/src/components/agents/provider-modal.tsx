import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import type {
  AgentProviderView,
  AgentSpecView,
} from "@/lib/agent-types";

type ModelOption = { id: string; label: string };

export function ProviderModal({
  open,
  onOpenChange,
  organizationId,
  provider,
  specs,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  provider: AgentProviderView | null;
  specs: AgentSpecView[];
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [spec, setSpec] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [model, setModel] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [maxRequestTokens, setMaxRequestTokens] = React.useState("");
  const [models, setModels] = React.useState<ModelOption[]>([]);
  const [busy, setBusy] = React.useState(false);

  const chosen = specs.find((entry) => entry.id === spec);

  React.useEffect(() => {
    if (!open) return;

    setName(provider?.name ?? "");
    setSpec(provider?.spec ?? specs[0]?.id ?? "");
    setBaseUrl(provider?.baseUrl ?? specs[0]?.baseUrl ?? "");
    setModel(provider?.model ?? "");
    setApiKey("");
    setIsDefault(provider?.isDefault ?? false);
    setMaxRequestTokens(provider?.maxRequestTokens?.toString() ?? "");
    setModels([]);
  }, [open, provider, specs]);

  React.useEffect(() => {
    const listed = specs.find((entry) => entry.id === spec)?.models ?? [];
    setModels(listed);
    if (model === "") setModel(listed[0]?.id ?? "");
  }, [model, spec, specs]);

  React.useEffect(() => {
    if (provider !== null || chosen === undefined) return;
    setBaseUrl(chosen.baseUrl);
  }, [chosen, provider]);

  const loadModels = async (): Promise<void> => {
    setBusy(true);

    try {
      const body =
        provider === null
          ? { spec, baseUrl, ...(apiKey === "" ? {} : { apiKey }) }
          : { providerId: provider.id };

      const response = await apiFetch<{ models: string[] }>(
        `/api/v1/organizations/${organizationId}/agents/models`,
        { method: "POST", data: body },
      );

      const listed = response.models.map((id) => ({ id, label: id }));
      setModels(listed);
      setModel(response.models[0] ?? model);

      if (listed.length === 0) toast("This provider listed no models");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not list models");
    } finally {
      setBusy(false);
    }
  };

  const chooseSpec = (next: string): void => {
    setSpec(next);
    const nextModels = specs.find((entry) => entry.id === next)?.models ?? [];
    setModels(nextModels);
    setModel(nextModels[0]?.id ?? "");
  };

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    const budget = maxRequestTokens === "" ? undefined : Number(maxRequestTokens);

    const payload = {
      ...(provider === null
        ? {
            name,
            spec,
            model,
            ...(apiKey === "" ? {} : { apiKey }),
            isDefault,
          }
        : {
            model,
            ...(apiKey === "" ? {} : { apiKey }),
            isDefault,
          }),
      ...(budget === undefined ? {} : { maxRequestTokens: budget }),
      ...(chosen?.baseUrl === "" ? { baseUrl } : {}),
    };

    setBusy(true);

    try {
      await apiFetch(
        provider === null
          ? `/api/v1/organizations/${organizationId}/agents/providers`
          : `/api/v1/organizations/${organizationId}/agents/providers/${provider.id}`,
        { method: provider === null ? "POST" : "PATCH", data: payload },
      );

      toast.success(provider === null ? "Provider added" : "Provider updated");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the provider",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={provider === null ? "Add a model provider" : `Edit ${provider.name}`}
      description="Wasanni calls this endpoint with your key and meters every answer against your usage."
    >
      <form onSubmit={submit} className="mt-5 space-y-3">
        {provider === null && (
          <div className="space-y-1.5">
            <Label htmlFor="provider-name">Name</Label>
            <Input
              id="provider-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Groq fast lane"
              required
              autoFocus
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <SearchableSelect
              value={spec}
              onValueChange={chooseSpec}
              disabled={provider !== null}
              options={specs.map((entry) => {
                return {
                  value: entry.id,
                  label: entry.label,
                };
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-key">API key</Label>
            <Input
              id="provider-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={provider?.hasKey ?? false ? "stored — leave blank to keep" : "optional for local endpoints"}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-base-url">Base URL</Label>
          <Input
            id="provider-base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.example.com/v1"
            disabled={chosen !== undefined && chosen.baseUrl !== ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-model">Model</Label>
          <div className="flex gap-2">
            {models.length > 0 ? (
              <SearchableSelect
                value={model}
                onValueChange={setModel}
                options={models.map((entry) => ({
                  value: entry.id,
                  label: entry.label === entry.id ? entry.id : `${entry.label} · ${entry.id}`,
                }))}
                className="min-w-0 flex-1"
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadModels}
              disabled={busy}
            >
              Load models
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider-budget">Token budget per request</Label>
          <Input
            id="provider-budget"
            type="number"
            min={1000}
            step={1000}
            value={maxRequestTokens}
            onChange={(event) => setMaxRequestTokens(event.target.value)}
            placeholder="32000"
          />
          <p className="text-xs text-muted-foreground">
            Groq's free tier answers 8000 tokens a minute. Set the number your key allows and
            Wasanni drops the oldest turns of a chat until the request fits.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-launch-ink/15 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Default provider</p>
            <p className="text-xs text-muted-foreground">
              Use this provider when no provider is selected.
            </p>
          </div>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} label={isDefault ? "On" : "Off"} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !model || (provider === null && !name)}>
            {busy ? "Saving…" : provider === null ? "Add provider" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
