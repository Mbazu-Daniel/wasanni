import * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
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
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "fixed left-1/2 top-1/2 z-[90] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-2 shadow-2xl backdrop:bg-ink/80 backdrop:backdrop-blur-md",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
