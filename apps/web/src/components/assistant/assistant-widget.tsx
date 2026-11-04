import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  IconEraser,
  IconMessageCircle,
  IconPlayerStop,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { ChatMarkdown } from "@/components/primitives/chat-markdown";
import { UserBubble } from "@/components/builder/user-bubble";
import { Button } from "@/components/ui/button";
import {
  askAssistant,
  messageOf,
  readTurns,
  writeTurns,
  type AssistantTurn,
} from "@/lib/assistant";

const SUGGESTIONS = [
  "How do I post a verified score?",
  "Which endpoints create a tournament?",
  "How does the realtime leaderboard connection work?",
];

const TOOL_NOTES: Record<string, string> = {
  api_docs: "reading the endpoint schemas",
  integration_guide: "reading the integration guides",
};

export function AssistantWidget() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<AssistantTurn[]>(readTurns);
  const [draft, setDraft] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const scroll = React.useRef<HTMLDivElement>(null);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    writeTurns(turns);
  }, [turns]);

  React.useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [turns, note, failure, open]);

  React.useEffect(() => () => abort.current?.abort(), []);

  const answer = (text: string): void =>
    setTurns((current) => {
      const next = [...current];
      const last = next[next.length - 1];

      if (last === undefined || last.role !== "assistant") return current;

      next[next.length - 1] = { role: "assistant", text: last.text + text };

      return next;
    });

  const send = async (question: string): Promise<void> => {
    const asked = question.trim();

    if (asked === "" || running) return;

    const history: AssistantTurn[] = [...turns, { role: "user", text: asked }];

    setTurns([...history, { role: "assistant", text: "" }]);
    setDraft("");
    setFailure(null);
    setNote(null);
    setRunning(true);

    const controller = new AbortController();
    abort.current = controller;

    try {
      await askAssistant({
        turns: history,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.kind === "delta") answer(event.text);
          else if (event.kind === "thinking") setNote("thinking it through");
          else if (event.kind === "tool" && event.state === "call")
            setNote(TOOL_NOTES[event.tool] ?? "looking it up");
          else if (event.kind === "error") setFailure(event.message);
          else if (event.kind === "done") setNote(null);
        },
      });
    } catch (caught) {
      if (!controller.signal.aborted) setFailure(messageOf(caught));
    } finally {
      abort.current = null;
      setNote(null);
      setRunning(false);
    }
  };

  if (pathname.endsWith("/builder")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Wasanni assistant"
          className="flex h-[min(34rem,78vh)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border-2 border-launch-ink bg-card"
        >
          <header className="flex items-center gap-2 border-b border-launch-ink/20 px-3.5 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
              Wasanni assistant
            </p>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear this chat"
                disabled={turns.length === 0}
                onClick={() => {
                  setTurns([]);
                  setFailure(null);
                }}
              >
                <IconEraser />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close the assistant"
                onClick={() => setOpen(false)}
              >
                <IconX />
              </Button>
            </div>
          </header>

          <div ref={scroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ask about any Wasanni endpoint, payload, or integration guide.
                </p>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="block w-full rounded-lg border border-launch-ink/20 px-3 py-2 text-left text-[13px] hover:border-launch-ink/50 hover:bg-secondary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {turns.map((turn, index) =>
              turn.role === "user" ? (
                <UserBubble key={index} text={turn.text} />
              ) : (
                turn.text !== "" && (
                  <div key={index} className="min-w-0">
                    <ChatMarkdown text={turn.text} />
                  </div>
                )
              ),
            )}

            {note !== null && (
              <p className="px-1 text-sm text-muted-foreground">{`${note}…`}</p>
            )}

            {failure !== null && (
              <p className="rounded-lg border border-destructive/40 px-3 py-2 text-[13px] text-destructive">
                {failure}
              </p>
            )}
          </div>

          <div className="border-t-2 border-launch-ink/85 p-2.5">
            <div className="flex items-end gap-1.5 rounded-xl border-2 border-launch-ink bg-background px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-ring">
              <textarea
                value={draft}
                rows={1}
                placeholder="Ask about an endpoint…"
                aria-label="Ask the assistant"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && running) {
                    event.preventDefault();
                    abort.current?.abort();
                    return;
                  }
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey || !event.shiftKey)
                  ) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                className="min-h-8 w-full resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              {running ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Stop the answer"
                  onClick={() => abort.current?.abort()}
                >
                  <IconPlayerStop />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Send the question"
                  disabled={draft.trim() === ""}
                  onClick={() => void send(draft)}
                >
                  <IconSend />
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close the assistant" : "Open the assistant"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex size-12 items-center justify-center rounded-full bg-launch-ink text-paper shadow-[3px_3px_0_var(--color-pink)] transition-transform active:scale-[0.97]"
      >
        {open ? <IconX className="size-5" /> : <IconMessageCircle className="size-5" />}
      </button>
    </div>
  );
}
