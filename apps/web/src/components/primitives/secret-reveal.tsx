import * as React from "react";
import { IconCheck, IconCopy, IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SecretReveal({
  secret,
  label = "Secret",
  warning = "This secret is shown once. Store it somewhere safe before closing.",
  onAcknowledge,
}: {
  secret: string;
  label?: string;
  warning?: string;
  onAcknowledge: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
        <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
        <p className="text-xs text-amber-100">{warning}</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={secret}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
            {copied ? (
              <>
                <IconCheck className="size-3.5" /> Copied
              </>
            ) : (
              <>
                <IconCopy className="size-3.5" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => {
            setAcknowledged(event.target.checked);
            if (event.target.checked) onAcknowledge();
          }}
          className="size-3.5 rounded border-border"
        />
        I have saved this secret somewhere safe
      </label>
    </div>
  );
}
