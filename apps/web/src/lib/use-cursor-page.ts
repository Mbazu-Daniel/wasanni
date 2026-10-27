import * as React from "react";

export function useCursorPage() {
  const [history, setHistory] = React.useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = React.useState(0);

  const reset = React.useCallback(() => {
    setHistory([null]);
    setPageIndex(0);
  }, []);

  const next = React.useCallback(
    (nextCursor: string) => {
      setHistory((previous) => [...previous.slice(0, pageIndex + 1), nextCursor]);
      setPageIndex((value) => value + 1);
    },
    [pageIndex],
  );

  const previous = React.useCallback(() => {
    setPageIndex((value) => Math.max(value - 1, 0));
  }, []);

  return {
    cursor: history[pageIndex] ?? null,
    pageIndex,
    hasPrevious: pageIndex > 0,
    next,
    previous,
    reset,
  };
}
