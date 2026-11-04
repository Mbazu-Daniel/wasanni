import * as React from "react";

type CursorState = {
  key: string;
  history: (string | null)[];
  index: number;
};

const fresh = (key: string): CursorState => ({ key, history: [null], index: 0 });

export function useCursorPage(resetKey = "") {
  const [state, setState] = React.useState<CursorState>(() => fresh(resetKey));

  const current = state.key === resetKey ? state : fresh(resetKey);

  const next = React.useCallback(
    (nextCursor: string) => {
      setState((previous) => {
        const base = previous.key === resetKey ? previous : fresh(resetKey);

        return {
          key: resetKey,
          history: [...base.history.slice(0, base.index + 1), nextCursor],
          index: base.index + 1,
        };
      });
    },
    [resetKey],
  );

  const previous = React.useCallback(() => {
    setState((previous) => {
      const base = previous.key === resetKey ? previous : fresh(resetKey);

      return {
        key: resetKey,
        history: base.history,
        index: Math.max(base.index - 1, 0),
      };
    });
  }, [resetKey]);

  return {
    cursor: current.history[current.index] ?? null,
    pageIndex: current.index,
    hasPrevious: current.index > 0,
    next,
    previous,
  };
}
