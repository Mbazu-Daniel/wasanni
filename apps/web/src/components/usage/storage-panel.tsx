import { motion } from "motion/react";
import { IconDeviceGamepad2, IconLayout } from "@tabler/icons-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UsageStorageView } from "@/lib/usage-types";

export function StorageBreakdown({
  storage,
}: {
  storage: UsageStorageView | undefined;
}) {
  const total = storage?.total ?? 0;

  return (
    <div>
      <h2 className="text-sm font-semibold">Storage</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {storage === undefined ? "—" : formatBytes(total)} used across{" "}
        {storage?.games.length ?? 0} games and {storage?.templates.length ?? 0}{" "}
        templates.
      </p>

      <div className="mt-3 space-y-2">
        {storage === undefined || total === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No storage used yet.</p>
          </div>
        ) : (
          <>
            <Bar
              label="Games"
              value={storage.totalGames}
              total={total}
              color="from-pink to-pink-soft"
            />
            <Bar
              label="Templates"
              value={storage.totalTemplates}
              total={total}
              color="from-blue to-blue-soft"
            />
          </>
        )}
      </div>

      {storage !== undefined && storage.games.length > 0 && (
        <div className="mt-6 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Storage breakdown</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Current ready files, by game and template.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2.5">
              <IconDeviceGamepad2 className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Games</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {formatBytes(storage.totalGames)}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {storage.games.map((game) => (
                  <tr
                    key={game.id}
                    className="border-t border-border first:border-t-0"
                  >
                    <td className="px-4 py-2.5 align-middle">
                      <span className="text-sm">{game.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right align-middle font-mono text-xs text-muted-foreground">
                      {game.fileCount} file{game.fileCount === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-2.5 text-right align-middle font-mono text-xs">
                      {formatBytes(game.sizeBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {storage.templates.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2.5">
                <IconLayout className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Templates</span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {formatBytes(storage.totalTemplates)}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {storage.templates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-t border-border first:border-t-0"
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <span className="text-sm">{template.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right align-middle font-mono text-xs">
                        {formatBytes(template.sizeBytes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{formatBytes(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
