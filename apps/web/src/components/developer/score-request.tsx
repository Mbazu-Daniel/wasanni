import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/primitives/copy-field";
import { Code, Explanation } from "./panel.tsx";

export function ScoreRequestTool() {
  const [sessionId, setSessionId] = React.useState("gsx_7QH2M9XK4C8B");
  const [score, setScore] = React.useState("940");
  const [apiKey, setApiKey] = React.useState("");
  const [endSession, setEndSession] = React.useState(false);

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:9000";
  const body = JSON.stringify(
    {
      score: Number(score) || 0,
      ...(endSession ? { endSession: true } : {}),
    },
    null,
    2,
  );
  const curl = [
    `curl -XPOST ${apiUrl}/api/v1/platform/sessions/${sessionId}/score \\`,
    `  -H 'x-api-key: ${apiKey === "" ? "<your api key>" : apiKey}' \\`,
    `  -H 'content-type: application/json' \\`,
    `  -d '${body}'`,
  ].join("\n");

  return (
    <div className="space-y-5">
      <Explanation>
        A platform submits a score to{" "}
        <Code>POST /api/v1/platform/sessions/:sessionId/score</Code> with its
        api key. The body carries the score, and the signature from the Score
        HMAC tab when the game asks for one.
      </Explanation>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="req-session">Session ID</Label>
          <Input
            id="req-session"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="req-score">Score</Label>
          <Input
            id="req-score"
            type="number"
            min={0}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="req-key">Api key</Label>
        <Input
          id="req-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="wsk_…"
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          This never leaves your browser.
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={endSession}
          onChange={(event) => setEndSession(event.target.checked)}
          className="size-3.5 accent-pink"
        />
        End the session with this score
      </label>

      <div className="space-y-1.5">
        <Label>Request body</Label>
        <CopyField value={body} />
      </div>

      <div className="space-y-1.5">
        <Label>curl</Label>
        <CopyField value={curl} />
      </div>
    </div>
  );
}

