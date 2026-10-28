import * as React from "react";
import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

type Sort = { key: string; direction: "asc" | "desc" };

export function DataTable<T>({
  columns,
  data,
  loading,
  empty,
  getRowId,
  onRowClick,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const [sort, setSort] = React.useState<Sort | null>(null);

  const rows = React.useMemo(() => {
    if (sort === null) return data;

    const column = columns.find((entry) => entry.key === sort.key);

    if (column?.sortValue === undefined) return data;

    return [...data].sort((left, right) => {
      const a = column.sortValue!(left);
      const b = column.sortValue!(right);
      const compared =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b));

      return sort.direction === "asc" ? compared : -compared;
    });
  }, [columns, data, sort]);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );

  if (loading) {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
        <div className="border-b border-border bg-card/40 px-4 py-2.5">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <table className="w-full text-sm">
        <thead className="bg-card/40">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
                  column.className,
                )}
              >
                {column.sortValue === undefined ? (
                  column.header
                ) : (
                  <button
                    onClick={() => toggle(column.key)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    {column.header}
                    <span className="text-muted-foreground/60">
                      {sort?.key !== column.key ? (
                        <IconSelector className="size-3" />
                      ) : sort.direction === "asc" ? (
                        <IconChevronUp className="size-3" />
                      ) : (
                        <IconChevronDown className="size-3" />
                      )}
                    </span>
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowId?.(row) ?? index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-t border-border transition-colors",
                onRowClick && "cursor-pointer hover:bg-ink/[0.04]",
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-middle">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
