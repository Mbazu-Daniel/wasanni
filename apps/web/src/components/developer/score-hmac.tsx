import * as React from "react";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/primitives/copy-field";
import { sign } from "@/lib/hmac";
import { Code, Explanation } from "./panel.tsx";

export function ScoreHmacTool() {
  const [sessionId, setSessionId] = React.useState("gsx_7QH2M9XK4C8B");
  const [score, setScore] = React.useState("940");
  const [secret, setSecret] = React.useState("");
  const [signature, setSignature] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const payload = `${sessionId}|${score}`;

  async function compute() {
    if (secret === "") {
      setError("The signing key is required");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      setSignature(await sign(secret, payload, "base64url"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not compute");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Explanation>
        A session created with <Code>scoreVerification.mode</Code> set to{" "}
        <Code>hmac</Code> or <Code>both</Code> returns a signing key. Sign{" "}
        <Code>"&lt;sessionId&gt;|&lt;score&gt;"</Code> with HMAC-SHA256 and send
        the base64url result as <Code>signature</Code> on{" "}
        <Code>POST /api/v1/play/sessions/:sessionId/score</Code>.
      </Explanation>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hmac-session">Session ID</Label>
          <Input
            id="hmac-session"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hmac-score">Score</Label>
          <Input
            id="hmac-score"
            type="number"
            min={0}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hmac-secret">Signing key</Label>
        <Input
          id="hmac-secret"
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="The key returned when the session was created"
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          This never leaves your browser.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Payload being signed</Label>
        <CopyField value={payload} />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={compute} disabled={busy || secret === ""}>
          {busy ? "Computing…" : "Compute signature"}
        </Button>
        {error !== null && (
          <span className="flex items-center gap-1 text-xs text-rose-300">
            <IconX className="size-3.5" />
            {error}
          </span>
        )}
      </div>

      {signature !== "" && (
        <div className="space-y-1.5">
          <Label>Signature</Label>
          <CopyField value={signature} />
        </div>
      )}
    </div>
  );
}

