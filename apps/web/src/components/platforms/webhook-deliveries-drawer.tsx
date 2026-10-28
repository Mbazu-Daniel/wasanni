import { useQuery } from "@tanstack/react-query";
import { IconX } from "@tabler/icons-react";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Delivery = {
  id: string;
  eventId: string;
  eventType: string;
  attempt: number;
  status: "delivered" | "failed" | "retrying";
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
};

type WebhookLite = {
  id: string;
  url: string;
};

export function WebhookDeliveriesDrawer({
  organizationId,
  webhook,
  onClose,
}: {
  organizationId: string;
  webhook: WebhookLite | null;
  onClose: () => void;
}) {
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries", organizationId, webhook?.id],
    queryFn: () =>
      apiFetch<{ deliveries: Delivery[] }>(
        `/api/v1/organizations/${organizationId}/webhooks/${webhook!.id}/deliveries`,
      ).then((response) => response.deliveries),
    enabled: webhook !== null,
  });

  if (webhook === null) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[min(92vw,520px)] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Deliveries</h2>
            {webhook && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {webhook.url}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-ink/[0.07] hover:text-foreground"
            aria-label="Close"
          >
            <IconX className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No deliveries yet.
            </p>
          ) : (
            <div className="space-y-2">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-lg border border-border bg-ink/[0.04] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          delivery.status === "delivered"
                            ? "success"
                            : delivery.status === "retrying"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {delivery.status}
                      </Badge>
                      <span className="font-mono text-xs">{delivery.eventType}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        attempt {delivery.attempt}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(delivery.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {delivery.statusCode !== null && (
                      <span className="font-mono">status {delivery.statusCode}</span>
                    )}
                    {delivery.durationMs !== null && (
                      <span className="font-mono">{delivery.durationMs}ms</span>
                    )}
                    <span className="truncate font-mono">{delivery.eventId}</span>
                  </div>
                  {(delivery.error ?? delivery.responseBody) !== null && (
                    <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-ink/20 p-2 font-mono text-[10px] text-muted-foreground">
                      {delivery.error ?? delivery.responseBody}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
