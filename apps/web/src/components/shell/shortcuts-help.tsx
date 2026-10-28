import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NAVIGATION_SHORTCUTS: [keys: string, label: string][] = [
  ["G D", "Overview"],
  ["G G", "Games"],
  ["G T", "Templates"],
  ["G P", "Platforms"],
  ["G A", "Assignments"],
  ["G K", "API keys"],
  ["G W", "Webhooks"],
  ["G O", "Tournaments"],
  ["G M", "Matches"],
  ["G U", "Audit"],
  ["G F", "Developer"],
  ["G E", "Members"],
  ["G C", "Account"],
];

const ACTION_SHORTCUTS: [keys: string, label: string][] = [
  ["⌘ K", "Command palette"],
  ["/", "Open search"],
  ["?", "Show this help"],
  ["N", "New — context aware"],
  [",", "Account settings"],
  ["Esc", "Close any dialog"],
];

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Press ? anywhere on the dashboard to open this panel."
      className="w-[min(94vw,640px)]"
      footer={
        <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Navigation
          </h3>
          <div className="mt-3 space-y-1">
            {NAVIGATION_SHORTCUTS.map(([keys, label]) => (
              <Row key={keys} label={label}>
                <Kbd>{keys.split(" ")[0]}</Kbd>
                <span className="text-[10px] text-muted-foreground/60">then</span>
                <Kbd>{keys.split(" ")[1]}</Kbd>
              </Row>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Actions
          </h3>
          <div className="mt-3 space-y-1">
            {ACTION_SHORTCUTS.map(([keys, label]) => (
              <Row key={keys} label={label}>
                <Kbd>{keys}</Kbd>
              </Row>
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-white/[0.04] px-1.5 font-mono text-[10px] text-foreground">
      {children}
    </span>
  );
}
