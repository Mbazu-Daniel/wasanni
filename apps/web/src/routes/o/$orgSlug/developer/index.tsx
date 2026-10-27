import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconCheck,
  IconCode,
  IconX,
  IconWebhook,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { CopyField } from "@/components/primitives/copy-field";
import { PageHeader } from "@/components/primitives/page-header";

const TABS = [
  {
    value: "score-hmac",
    label: (
      <>
        <IconShieldCheck className="size-3.5" />
        Score HMAC
      </>
    ),
  },
  {
    value: "webhook",
    label: (
      <>
        <IconWebhook className="size-3.5" />
        Webhook signature
      </>
    ),
  },
  {
    value: "token",
    label: (
      <>
        <IconCode className="size-3.5" />
        Session token
      </>
    ),
  },
];

export const Route = createFileRoute("/o/$orgSlug/developer/")({
  head: () => ({ meta: [{ title: "Developer · Wasanni" }] }),
  component: DeveloperPage,
});

function DeveloperPage() {
  const [tab, setTab] = React.useState("score-hmac");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Developer"
        description="Verify your integration without leaving the dashboard. The math runs in your browser — nothing here is sent to a server."
      />

      <Tabs value={tab} onValueChange={setTab} items={TABS} />

      <div className="mt-6">
        {tab === "score-hmac" && <ScoreHmacTool />}
        {tab === "webhook" && <WebhookVerifyTool />}
        {tab === "token" && <TokenDecoderTool />}
      </div>
    </div>
  );
}

function ScoreHmacTool() {
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

function WebhookVerifyTool() {
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

function TokenDecoderTool() {
  const [token, setToken] = React.useState("");
  const [decoded, setDecoded] = React.useState<{
    header: unknown;
    payload: unknown;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function decode() {
    setError(null);
    setDecoded(null);

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      setError("A JWT has three dot-separated parts.");
      return;
    }

    try {
      setDecoded({
        header: JSON.parse(base64UrlDecode(parts[0]!)),
        payload: JSON.parse(base64UrlDecode(parts[1]!)),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not decode");
    }
  }

  const payload = decoded?.payload as Record<string, unknown> | undefined;
  const expiresAt = typeof payload?.exp === "number" ? payload.exp : null;
  const expired = expiresAt !== null && expiresAt * 1000 < Date.now();

  return (
    <div className="space-y-5">
      <Explanation>
        Decode a session token to see the session, organization, platform, game,
        player and expiry it carries. This does not verify the signature — the
        API does that on every request.
      </Explanation>

      <div className="space-y-1.5">
        <Label htmlFor="tok-input">Session token</Label>
        <Textarea
          id="tok-input"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIs…"
          className="min-h-[100px] font-mono text-[11px]"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={decode} disabled={token.trim() === ""}>
          Decode
        </Button>
        {decoded !== null && (
          <Badge variant={expired ? "muted" : "success"} className="text-[10px]">
            {expired ? "expired" : "not expired"}
          </Badge>
        )}
      </div>

      {error !== null && (
        <p className="flex items-center gap-1.5 text-xs text-rose-300">
          <IconX className="size-3.5" />
          {error}
        </p>
      )}

      {decoded !== null && (
        <div className="space-y-3">
          <JsonBlock label="Header" value={decoded.header} />
          <JsonBlock label="Payload" value={decoded.payload} />
          {expiresAt !== null && (
            <p className="text-xs text-muted-foreground">
              Expires{" "}
              <span className="font-mono text-foreground">
                {new Date(expiresAt * 1000).toISOString()}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <Label className="font-mono text-[10px] uppercase tracking-[0.22em]">
        {label}
      </Label>
      <pre className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-black/20 p-2 font-mono text-[10px] text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Explanation({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/[0.05] px-1 py-0.5 font-mono">
      {children}
    </code>
  );
}

function extractSignature(value: string): string {
  const match = /v1=([0-9a-f]+)/i.exec(value);
  return match?.[1] ?? value.trim();
}

async function sign(
  secret: string,
  message: string,
  encoding: "hex" | "base64url",
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );

  if (encoding === "hex") {
    return Array.from(signature)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  return atob(padded);
}
