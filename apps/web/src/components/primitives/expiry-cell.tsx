export function ExpiryCell({ expiresAt }: { expiresAt: string | null }) {
  if (expiresAt === null) {
    return <span className="text-xs text-muted-foreground">Never</span>;
  }

  if (new Date(expiresAt) < new Date()) {
    return <span className="text-xs text-rose-300">Expired</span>;
  }

  return (
    <span className="text-xs text-muted-foreground">
      {new Date(expiresAt).toLocaleDateString()}
    </span>
  );
}
