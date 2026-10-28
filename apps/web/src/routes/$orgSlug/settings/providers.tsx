import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/primitives/page-header";
import { ProviderModal } from "@/components/agents/provider-modal";
import { apiFetch } from "@/lib/api-client";
import { usdPerMillion } from "@/lib/format";
import type {
  AgentProviderView,
  AgentSpecView,
} from "@/lib/agent-types";

export const Route = createFileRoute("/$orgSlug/settings/providers")({
  head: () => ({ meta: [{ title: "Providers · Wasanni" }] }),
  component: ProvidersSettingsPage,
});

function ProviderCard({
  provider,
  onEdit,
  onDelete,
}: {
  provider: AgentProviderView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-launch-ink/85 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{provider.name}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/60">
            {provider.model}
          </p>
        </div>
        {provider.isDefault && (
          <span className="rounded-full bg-cyan px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-print">
            default
          </span>
        )}
      </div>

      <p className="mt-2 truncate font-mono text-[11px] text-launch-ink/55">
        {provider.baseUrl}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span
          className={
            provider.hasKey
              ? "font-mono text-[10px] uppercase tracking-[0.14em] text-pink"
              : "font-mono text-[10px] uppercase tracking-[0.14em] text-launch-ink/45"
          }
        >
          {provider.hasKey ? "key stored" : "no key"}
        </span>
        <span className="font-mono text-[10px] text-launch-ink/55">
          {provider.pricing === null
            ? "unpriced"
            : `in ${usdPerMillion(provider.pricing.inputMicrosPerMillion)} · out ${usdPerMillion(provider.pricing.outputMicrosPerMillion)} /M`}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <IconPencil />
          Edit
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <IconTrash />
          Remove
        </Button>
      </div>
    </div>
  );
}

function ProvidersSettingsPage() {
  const { org } = Route.useRouteContext();
  const organizationId = org?.id ?? "";
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AgentProviderView | null>(null);

  const { data: specs = [] } = useQuery({
    queryKey: ["agent-specs"],
    queryFn: () =>
      apiFetch<{ specs: AgentSpecView[] }>(
        `/api/v1/organizations/${organizationId}/agents/specs`,
      ).then((response) => response.specs),
  });

  const { data: providers = [], isPending } = useQuery({
    queryKey: ["agents", organizationId, "providers"],
    queryFn: () =>
      apiFetch<{ providers: AgentProviderView[] }>(
        `/api/v1/organizations/${organizationId}/agents/providers`,
      ).then((response) => response.providers),
  });

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["agents", organizationId] });
  };

  const remove = async (provider: AgentProviderView): Promise<void> => {
    try {
      await apiFetch(
        `/api/v1/organizations/${organizationId}/agents/providers/${provider.id}`,
        { method: "DELETE" },
      );
      toast.success(`${provider.name} removed`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the provider");
    }
  };

  if (org === null) return null;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Providers"
        description="Every model this workspace can call. The playground runs on these; without one it says so."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <IconPlus />
            Add provider
          </Button>
        }
      />

      {isPending && <Skeleton className="h-32 rounded-xl" />}

      {!isPending && providers.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-launch-ink/30 p-8 text-center">
          <p className="text-sm font-medium">No provider yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add one to run prompts against your own model and key.
          </p>
        </div>
      )}

      <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onEdit={() => {
              setEditing(provider);
              setModalOpen(true);
            }}
            onDelete={() => void remove(provider)}
          />
        ))}
      </div>

      <ProviderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={organizationId}
        provider={editing}
        specs={specs}
        onSaved={refresh}
      />
    </div>
  );
}
