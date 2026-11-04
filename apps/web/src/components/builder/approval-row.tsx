import { Button } from "@/components/ui/button";
import type { AgentPendingApproval } from "@/lib/agent-types";

const summaryOf = (args: unknown): string => {
  if (typeof args !== "object" || args === null) return "";

  return Object.entries(args)
    .map(([key, value]) =>
      typeof value === "string" && value.length > 80
        ? `${key}: ${value.length} characters`
        : `${key}: ${String(value)}`,
    )
    .join("\n");
};

export function ApprovalRow({
  approval,
  gameName,
  onDecide,
}: {
  approval: AgentPendingApproval;
  gameName: string | null;
  onDecide: (approved: boolean) => void;
}) {
  const summary = summaryOf(approval.args);

  return (
    <div className="min-w-0 rounded-2xl border-2 border-pink bg-card px-3.5 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink">Approval</p>
      <p className="mt-1 text-sm">
        Allow <span className="font-mono">{approval.tool}</span>
        {gameName === null ? "" : ` on ${gameName}`}?
      </p>
      {summary !== "" && (
        <p className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-launch-ink/70">
          {summary}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => onDecide(true)}>
          Allow
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDecide(false)}>
          Deny
        </Button>
      </div>
    </div>
  );
}
