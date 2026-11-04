import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IMAGE_TYPES } from "@/lib/image-upload";

type ImagePickerProps = {
  imageUrl: string | null;
  onPick: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  fallback?: ReactNode;
  className?: string;
  removeLabel?: string;
};

export const ImagePicker = ({
  imageUrl,
  onPick,
  onRemove,
  fallback,
  className = "size-20 rounded-xl",
  removeLabel = "Remove",
}: ImagePickerProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span
        className={`grid shrink-0 place-items-center overflow-hidden border border-border bg-ink/[0.04] ${className}`}
      >
        {imageUrl === null ? (
          fallback
        ) : (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        )}
      </span>
      <div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void run(() => onPick(file));
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy
            ? "Uploading…"
            : imageUrl === null
              ? "Choose image"
              : "Change image"}
        </Button>
        {onRemove !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2"
            disabled={busy}
            onClick={() => void run(onRemove)}
          >
            {removeLabel}
          </Button>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          JPEG, PNG, WebP or AVIF. Up to 5 MB.
        </p>
      </div>
    </div>
  );
};
