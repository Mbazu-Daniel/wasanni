import * as React from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/primitives/copy-field";
import { sign } from "@/lib/hmac";
import { Code, Explanation } from "./panel.tsx";

export function WebhookVerifyTool() {
  const [timestamp, setTimestamp] = React.useState(
    String(Math.floor(Date.now() / 1000)),
  );
  const [secret, setSecret] = React.useState("");
  const [body, setBody] = React.useState(
    '{"id":"evt_abc123","type":"score.submitted","data":{"score":940}}',
  );
  const [provided, setProvided] = React.useState("");
  const [computed, setComputed] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const hex = extractSignature(provided);
  const valid =
    computed !== null && hex !== "" && computed.toLowerCase() === hex.toLowerCase();

  async function verify() {
    if (secret === "") return;

    setBusy(true);

    try {
      setComputed(await sign(secret, `${timestamp}.${body}`, "hex"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Explanation>
        Every webhook delivery carries an <Code>x-wasanni-signature</Code>{" "}
        header shaped <Code>t=&lt;timestamp&gt;,v1=&lt;hex&gt;</Code>. Recompute
        HMAC-SHA256 over <Code>"&lt;timestamp&gt;.&lt;rawBody&gt;"</Code> and
        compare.
      </Explanation>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wh-timestamp">Timestamp</Label>
          <Input
            id="wh-timestamp"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-secret">Signing secret</Label>
          <Input
            id="wh-secret"
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="whsec_…"
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-body">Raw request body</Label>
        <Textarea
          id="wh-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-[100px] font-mono text-[11px]"
          spellCheck={false}
        />
        <p className="text-[11px] text-muted-foreground">
          Paste exactly what you received. Whitespace matters.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-sig">Signature from the header</Label>
        <Input
          id="wh-sig"
          value={provided}
          onChange={(event) => setProvided(event.target.value)}
          placeholder="t=1700000000,v1=…"
          className="font-mono text-xs"
        />
      </div>

      <Button size="sm" onClick={verify} disabled={busy || secret === ""}>
        {busy ? "Computing…" : "Verify signature"}
      </Button>

      {computed !== null && (
        <div className="space-y-3 rounded-lg border border-border bg-white/[0.02] p-4">
          <div className="flex items-center gap-2">
            <Badge variant={valid ? "success" : "muted"} className="gap-1">
              {valid ? <IconCheck className="size-3" /> : <IconX className="size-3" />}
              {valid ? "Valid" : "Mismatch"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {hex === ""
                ? "Paste the header signature above to compare."
                : valid
                  ? "The signature matches the body."
                  : "The signature does not match the body."}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Computed signature</Label>
            <CopyField value={computed} />
          </div>

          {hex !== "" && (
            <div className="space-y-1.5">
              <Label>Provided signature</Label>
              <CopyField value={hex} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function extractSignature(value: string): string {
  const match = /v1=([0-9a-f]+)/i.exec(value);
  return match?.[1] ?? value.trim();
}
