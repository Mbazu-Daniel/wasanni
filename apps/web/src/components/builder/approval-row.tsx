import { Button } from "@/components/ui/button";
import type { AgentPendingApproval } from "@/lib/agent-types";

const TOOL_LABELS: Record<string, string> = {
  api_docs: "read the api docs",
  integration_guide: "read the integration guide",
  list_games: "list games",
  deploy_game: "publish the build",
  create_game: "create the game",
  bind_game: "bind the chat to the game",
  list_platforms: "list platforms",
  create_platform: "create the platform",
  list_assignments: "list assignments",
  create_assignment: "assign the game to the platform",
  read_match: "read the match",
  read_leaderboard: "read the leaderboard",
  read_tournament_standings: "read the tournament standings",
  create_tournament: "create the tournament",
  open_tournament: "open the tournament",
  register_player: "register the player",
  seed_tournament: "seed the tournament",
  cancel_tournament: "cancel the tournament",
  start_duel: "start the duel",
  complete_match: "complete the match",
  record_score: "record the score",
  create_api_key: "create the api key",
  list_tournaments: "list tournaments",
  read_tournament: "read the tournament",
};

const ARG_LABELS: Record<string, string> = {
  gameId: "game",
  platformId: "platform",
  tournamentId: "tournament id",
  matchId: "match",
  configId: "config",
  assignmentId: "assignment",
  fileId: "file",
  sessionId: "session",
  name: "name",
  slug: "slug",
  format: "format",
};

const toolLabelOf = (tool: string): string =>
  TOOL_LABELS[tool] ?? tool.replaceAll("_", " ");

const summaryOf = (
  args: unknown,
  games: { id: string; name: string }[],
  platforms: { id: string; name: string }[],
): string => {
  if (typeof args !== "object" || args === null) return "";

  return Object.entries(args)
    .map(([key, value]) => {
      if (key === "html" && typeof value === "string") return `build: ${value.length} characters`;
      if (key === "gameId" && typeof value === "string") {
        return `game: ${games.find((game) => game.id === value)?.name ?? value}`;
      }
      if (key === "platformId" && typeof value === "string") {
        return `platform: ${platforms.find((platform) => platform.id === value)?.name ?? value}`;
      }
      const label = ARG_LABELS[key] ?? key.replaceAll("_", " ");
      if (typeof value === "string") {
        return value.length > 80 ? `${label}: ${value.length} characters` : `${label}: ${value}`;
      }
      return `${label}: ${JSON.stringify(value)}`;
    })
    .join("\n");
};

export function ApprovalRow({
  approval,
  gameName,
  games,
  platforms,
  onDecide,
}: {
  approval: AgentPendingApproval;
  gameName: string | null;
  games: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  onDecide: (approved: boolean) => void;
}) {
  const summary = summaryOf(approval.args, games, platforms);

  return (
    <div className="min-w-0 rounded-2xl border-2 border-pink bg-card px-3.5 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-pink">Approval</p>
      <p className="mt-1 text-sm">
        Allow {toolLabelOf(approval.tool)}
        {gameName === null ? "" : ` on ${gameName}`}?
      </p>
      {summary !== "" && (
        <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-launch-ink/70">
          {summary}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => onDecide(true)}>
          Allow
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDecide(false)}>
          Deny
        </Button>
      </div>
    </div>
  );
}
