import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconWebhook } from "@tabler/icons-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives/page-header";
import { DataTable, type DataTableColumn } from "@/components/primitives/data-table";
import { EmptyState } from "@/components/primitives/empty-state";
import { CreateWebhookModal } from "@/components/platforms/create-webhook-modal";
import type { PlatformSummary } from "@/components/platforms/platform-choice";
import { Badge } from "@/components/ui/badge";

type OrgWebhookRow = {
  id: string;
  platformId: string;
  platformName: string | null;
  platformSlug: string | null;
  url: string;
  description: string | null;
  events: string[];
  enabled: boolean;
  lastDeliveryAt: string | null;
  lastFailureAt: string | null;
};

export const Route = createFileRoute("/$orgSlug/webhooks/")({
  head: () => ({ meta: [{ title: "Webhooks · Wasanni" }] }),
  component: OrgWebhooksPage,
});

function OrgWebhooksPage() {
  const { org } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const organizationId = org?.id ?? "";
  const orgSlug = org?.slug ?? "";

  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms", organizationId],
    queryFn: () =>
      apiFetch<{ platforms: PlatformSummary[] }>(
        `/api/v1/organizations/${organizationId}/platforms`,
      ).then((response) => response.platforms),
    enabled: org !== null,
  });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", organizationId, "all"],
    queryFn: () =>
      apiFetch<{ webhooks: OrgWebhookRow[] }>(
        `/api/v1/organizations/${organizationId}/webhooks`,
      ).then((response) => response.webhooks),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["webhooks", organizationId] });

  const columns: DataTableColumn<OrgWebhookRow>[] = [
    {
      key: "url",
      header: "Endpoint",
      sortValue: (row) => row.url,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{row.url}</p>
          {row.description && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "platformSlug",
      header: "Platform",
      sortValue: (row) => row.platformSlug ?? "",
      render: (row) =>
        row.platformSlug === null ? (
          <span className="text-xs text-muted-foreground">unknown</span>
        ) : (
          <Link
            to="/$orgSlug/platforms/$platformSlug"
            params={{ orgSlug: orgSlug, platformSlug: row.platformSlug }}
            search={{ tab: "webhooks" }}
            className="text-sm text-blue hover:underline"
          >
            {row.platformName ?? row.platformSlug}
          </Link>
        ),
    },
    {
      key: "enabled",
      header: "Status",
      sortValue: (row) => (row.enabled ? 1 : 0),
      render: (row) =>
        row.enabled ? (
          <Badge variant="success">enabled</Badge>
        ) : (
          <Badge variant="muted">disabled</Badge>
        ),
    },
    {
      key: "lastDeliveryAt",
      header: "Last delivery",
      sortValue: (row) => row.lastDeliveryAt ?? "",
      render: (row) => {
        const value = row.lastDeliveryAt ?? row.lastFailureAt;

        if (value === null) {
          return <span className="text-xs text-muted-foreground">Never</span>;
        }

        const failed = row.lastDeliveryAt === null;

        return (
          <span
            className={
              failed ? "text-xs text-rose-300" : "text-xs text-muted-foreground"
            }
          >
            {new Date(value).toLocaleString()}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Webhooks"
        actions={
          platforms.length > 0 ? (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-3.5" />
              Add webhook
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={webhooks}
        loading={isLoading}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            icon={<IconWebhook className="size-5" />}
            title="No webhooks yet"
            description={
              platforms.length === 0
                ? "A webhook delivers one platform's events, so create a platform first."
                : "Add an endpoint for one of your platforms to receive HMAC-signed deliveries."
            }
          />
        }
      />

      <CreateWebhookModal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && revealedSecret !== null && !acknowledged) {
            toast.error("Save the signing secret first");
            return;
          }
          setCreateOpen(open);
          if (!open) {
            setRevealedSecret(null);
            setAcknowledged(false);
          }
        }}
        organizationId={organizationId}
        target={{ kind: "pick", platforms }}
        onCreated={(secret) => {
          setRevealedSecret(secret);
          refresh();
        }}
        revealedSecret={revealedSecret}
        onAcknowledged={() => setAcknowledged(true)}
        acknowledged={acknowledged}
      />
    </div>
  );
}
