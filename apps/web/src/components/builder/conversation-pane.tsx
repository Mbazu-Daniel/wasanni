import * as React from "react";
import { Link } from "@tanstack/react-router";
import { IconRobot } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ChatMarkdown } from "@/components/primitives/chat-markdown";
import { extractArtifacts, type ArtifactFile } from "@/lib/agent-artifacts";
import type { AgentPendingApproval, AgentTurnView } from "@/lib/agent-types";
import type { AgentFailure, LiveReply } from "./types.ts";
import { ApprovalRow } from "./approval-row.tsx";
import { groupTurns } from "./turn-groups.ts";
import { TurnBubble } from "./turn-bubble.tsx";
import { UserBubble } from "./user-bubble.tsx";
import { WaitingNote } from "./waiting-note.tsx";

export function ConversationPane({
  orgSlug,
  sessionId,
  games,
  platforms,
  selectedGameId,
  onGameChange,
  hasProviders,
  providers,
  chosenProviderId,
  onProviderChange,
  turns,
  turnsPending,
  live,
  thinkingOpen,
  onThinkingOpenChange,
  failure,
  onDismissFailure,
  approval,
  approvalGameName,
  onDecide,
  shownTurnId,
  lastAssistantId,
  canRegenerate,
  onRegenerate,
  onShowTurn,
  onOpenFile,
  endRef,
}: {
  orgSlug: string;
  sessionId: string | null;
  games: { id: string; name: string; imageUrl: string | null }[];
  platforms: { id: string; name: string }[];
  selectedGameId: string | null;
  onGameChange: (gameId: string | null) => void;
  hasProviders: boolean;
  providers: { id: string; name: string; model: string }[];
  chosenProviderId: string;
  onProviderChange: (providerId: string) => void;
  turns: AgentTurnView[];
  turnsPending: boolean;
  live: LiveReply | null;
  thinkingOpen: boolean;
  onThinkingOpenChange: (open: boolean) => void;
  failure: AgentFailure | null;
  onDismissFailure: () => void;
  approval: AgentPendingApproval | null;
  approvalGameName: string | null;
  onDecide: (approved: boolean) => void;
  shownTurnId: string | null;
  lastAssistantId: string | null;
  canRegenerate: boolean;
  onRegenerate: () => void;
  onShowTurn: (turn: AgentTurnView) => void;
  onOpenFile: (file: ArtifactFile) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-3">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-pink">
          <IconRobot size={14} /> {sessionId === null ? "New chat" : "Conversation"}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <SearchableSelect
            compact
            className="w-44 shrink-0"
            value={selectedGameId ?? "none"}
            onValueChange={(value) => onGameChange(value === "none" ? null : value)}
            placeholder="Pick a game…"
            options={[{ value: "none", label: "No game" }, ...games.map((game) => ({
              value: game.id,
              label: game.name,
              imageUrl: game.imageUrl,
            }))]} />
          {providers.length > 0 && (
            <SearchableSelect
              compact
              className="w-44 shrink-0"
              value={chosenProviderId}
              onValueChange={onProviderChange}
              options={providers.map((provider) => ({
                value: provider.id,
                label: `${provider.name} · ${provider.model}`,
              }))}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5">
          {turnsPending && sessionId !== null && <Skeleton className="h-24 rounded-2xl" />}

          {sessionId === null && live === null && (
            <div className="grid flex-1 place-items-center">
              <div className="max-w-md text-center">
                <h1 className="font-poster text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                  Your models, <span className="text-pink">your key</span>
                </h1>
                <p className="mt-2 text-sm text-launch-ink/70">
                  Ask for a game, a page, or an answer. Anything the model writes as code
                  renders on the right.
                </p>
                {!hasProviders && (
                  <p className="mt-4 text-sm">
                    No provider in this workspace yet.{" "}
                    <Link
                      to="/$orgSlug/providers"
                      params={{ orgSlug }}
                      className="font-medium text-pink underline"
                    >
                      Add one in Settings
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          )}

          {groupTurns(turns).map((group, groupIndex) => (
            <div
              key={group.prompt?.id ?? group.answers[0]?.id ?? groupIndex}
              className="flex min-w-0 flex-col gap-3"
            >
              {group.prompt !== null && <UserBubble text={group.prompt.text} />}
              {group.answers.map((turn) => (
                <TurnBubble
                  key={turn.id}
                  turn={turn}
                  showing={shownTurnId === turn.id}
                  hasArtifact={extractArtifacts(turn.text).files.length > 0}
                  onShow={() => onShowTurn(turn)}
                  onOpenFile={onOpenFile}
                  onRegenerate={
                    turn.id === lastAssistantId && canRegenerate ? onRegenerate : undefined
                  }
                />
              ))}
            </div>
          ))}

          {live !== null && (
            <div className="flex min-w-0 flex-col gap-3">
              {live.prompt !== null && <UserBubble text={live.prompt} />}
              <div className="min-w-0 px-1">
                {live.thinking !== "" && (
                  <details
                    open={thinkingOpen}
                    onToggle={(event) => onThinkingOpenChange(event.currentTarget.open)}
                    className="mb-2.5 rounded-xl border border-dashed border-blue/40 bg-blue/10 px-3 py-2"
                  >
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-blue">
                      Thinking
                    </summary>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <ChatMarkdown text={live.thinking} />
                    </div>
                  </details>
                )}
                {live.answer === "" ? (
                  live.thinking === "" && <WaitingNote />
                ) : (
                  <ChatMarkdown text={live.answer} onOpenFile={onOpenFile} />
                )}
              </div>
            </div>
          )}

          {failure !== null && (
            <div className="flex min-w-0 flex-col gap-3">
              {failure.prompt !== null && <UserBubble text={failure.prompt} />}
              {failure.answer !== "" && (
                <div className="min-w-0 px-1">
                  <ChatMarkdown text={failure.answer} />
                </div>
              )}
              <div className="rounded-2xl border border-dashed border-destructive px-3.5 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-destructive">
                  {failure.code}
                </p>
                <p className="mt-1 text-sm break-words">{failure.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  {failure.retryable && failure.retry !== null && (
                    <button
                      type="button"
                      onClick={() => void failure.retry?.()}
                      className="rounded-full border border-launch-ink/30 px-2.5 py-1 text-xs font-medium hover:bg-launch-ink/5"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDismissFailure}
                    className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {approval !== null && (
            <ApprovalRow
              approval={approval}
              gameName={approvalGameName}
              games={games}
              platforms={platforms}
              onDecide={onDecide}
            />
          )}

          <div ref={endRef} />
        </div>
      </div>
    </>
  );
}
