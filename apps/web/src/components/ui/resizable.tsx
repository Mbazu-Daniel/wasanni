import * as React from "react";
import { cn } from "@/lib/utils";

type ResizableContextValue = {
  sizes: [number, number, number];
  resize: (handle: 0 | 1, delta: number, width: number) => void;
};

const ResizableContext = React.createContext<ResizableContextValue | null>(null);

export function ResizablePanelGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [sizes, setSizes] = React.useState<[number, number, number]>([22, 46, 32]);

  const resize = (handle: 0 | 1, delta: number, width: number): void => {
    const change = (delta / width) * 100;

    setSizes((current) => {
      if (handle === 0) {
        const left = Math.min(36, Math.max(18, current[0] + change));
        return [left, current[1] - (left - current[0]), current[2]];
      }

      const right = Math.min(42, Math.max(26, current[2] - change));
      return [current[0], current[1] - (right - current[2]), right];
    });
  };

  return (
    <ResizableContext.Provider value={{ sizes, resize }}>
      <div
        className={cn("flex min-h-0 flex-col lg:grid", className)}
        style={{
          gridTemplateColumns: `calc(${sizes[0]}% - 4px) 8px minmax(0, 1fr) 8px calc(${sizes[2]}% - 4px)`,
        }}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export function ResizablePanel({
  children,
  className,
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index: 0 | 1 | 2;
}) {
  return <div className={cn("min-h-0 min-w-0 max-lg:w-full", className)} data-panel-index={index}>{children}</div>;
}

export function ResizableHandle({ index }: { index: 0 | 1 }) {
  const context = React.useContext(ResizableContext);
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (context === null) return;

    const start = event.clientX;
    const width = event.currentTarget.parentElement?.clientWidth ?? 1;
    const move = (next: PointerEvent): void => {
      context.resize(index, next.clientX - start, width);
    };
    const stop = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <button
      type="button"
      aria-label="Resize panel"
      onPointerDown={handlePointerDown}
      className="group relative hidden w-2 cursor-col-resize items-center justify-center bg-transparent lg:flex"
    >
      <span className="h-12 w-px rounded-full bg-border transition-colors group-hover:bg-pink group-focus-visible:bg-pink" />
    </button>
  );
}
