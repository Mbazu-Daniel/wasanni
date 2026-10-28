import * as React from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title ?? label}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        "fixed left-1/2 top-1/2 z-[90] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop:bg-ink/80 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {footer && (
        <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>
      )}
    </dialog>
  );
}
