export function Explanation({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/[0.05] px-1 py-0.5 font-mono">
      {children}
    </code>
  );
}
