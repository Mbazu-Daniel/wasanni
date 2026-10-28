import * as React from "react";
import { IconUpload, IconFile } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type PickedFile = {
  file: File;
  name: string;
  contentType: string;
  sizeBytes: number;
};

export function FileDrop({
  onPick,
  accept = [],
  maxBytes,
  helper,
  className,
}: {
  onPick: (file: PickedFile) => void;
  accept?: string[];
  maxBytes?: number;
  helper?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const take = (file: File | undefined) => {
    if (file === undefined) return;

    if (accept.length > 0 && !accept.includes(file.name.split(".").pop()?.toLowerCase() ?? "")) {
      setError(`Only ${accept.join(", ")} files are accepted`);
      return;
    }

    if (maxBytes !== undefined && file.size > maxBytes) {
      setError("That file is too large");
      return;
    }

    setError(null);
    onPick({
      file,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          over
            ? "border-pink bg-pink/[0.05]"
            : "border-border hover:border-pink/40 hover:bg-ink/[0.04]",
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl border border-border bg-ink/[0.05] text-blue">
          <IconUpload className="size-4" />
        </span>
        <span className="text-sm font-medium">Drop a file or click to choose</span>
        {helper && (
          <span className="text-xs text-muted-foreground">{helper}</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept.map((extension) => `.${extension}`).join(",")}
        onChange={(event) => take(event.target.files?.[0])}
      />

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}

export function PickedFileRow({ picked }: { picked: PickedFile }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-ink/[0.04] p-3">
      <IconFile className="size-4 text-blue" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{picked.name}</p>
        <p className="text-xs text-muted-foreground">
          {Math.round(picked.sizeBytes / 1024)} KB
        </p>
      </div>
    </div>
  );
}
