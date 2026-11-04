import * as React from "react";
import { WAITING_WORDS } from "@/lib/waiting-words";

export function WaitingNote() {
  const [index, setIndex] = React.useState(() =>
    Math.floor(Math.random() * WAITING_WORDS.length),
  );

  React.useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % WAITING_WORDS.length),
      1500,
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm text-muted-foreground">{`${WAITING_WORDS[index] ?? "Waiting"}…`}</p>
  );
}
