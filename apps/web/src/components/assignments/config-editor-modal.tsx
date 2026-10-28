import * as React from "react";
import { toast } from "sonner";
import { IconAlertTriangle, IconBraces, IconForms } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";

export type ConfigRow = {
  id: string;
  organizationId: string;
  assignmentId: string;
  name: string;
  config: Record<string, unknown>;
  schemaVersion: number;
  revision: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type VerificationMode = "none" | "hmac" | "callback" | "both";

type ConfigShape = {
  sessionDurationSeconds?: number;
  rules?: {
    maxScore?: number;
    maxScorePerSecond?: number;
  };
  scoreVerification?: {
    mode?: VerificationMode;
    callback?: {
      url?: string;
      secret?: string;
      timeoutMs?: number;
    };
  };
};

function buildConfig(form: {
  sessionDurationMinutes: string;
  maxScore: string;
  maxScorePerSecond: string;
  verificationMode: VerificationMode;
  callbackUrl: string;
  callbackSecret: string;
  callbackTimeoutMs: string;
}): Record<string, unknown> {
  const config: ConfigShape = {};

  if (form.sessionDurationMinutes.trim()) {
    const minutes = Number(form.sessionDurationMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      config.sessionDurationSeconds = Math.round(minutes * 60);
    }
  }

  const rules: NonNullable<ConfigShape["rules"]> = {};

  if (form.maxScore.trim()) {
    const value = Number(form.maxScore);
    if (Number.isFinite(value) && value >= 0) rules.maxScore = value;
  }

  if (form.maxScorePerSecond.trim()) {
    const value = Number(form.maxScorePerSecond);
    if (Number.isFinite(value) && value >= 0) rules.maxScorePerSecond = value;
  }

  if (Object.keys(rules).length > 0) config.rules = rules;

  if (form.verificationMode !== "none") {
    const verification: NonNullable<ConfigShape["scoreVerification"]> = {
      mode: form.verificationMode,
    };

    if (form.verificationMode === "callback" || form.verificationMode === "both") {
      const callback: NonNullable<ConfigShape["scoreVerification"]>["callback"] = {};

      if (form.callbackUrl.trim()) callback.url = form.callbackUrl.trim();
      if (form.callbackSecret.trim()) callback.secret = form.callbackSecret.trim();

      if (form.callbackTimeoutMs.trim()) {
        const ms = Number(form.callbackTimeoutMs);
        if (Number.isFinite(ms) && ms >= 100 && ms <= 10_000) callback.timeoutMs = ms;
      }

      verification.callback = callback;
    }

    config.scoreVerification = verification;
  }

  return config;
}

export function ConfigEditorModal({
  open,
  onOpenChange,
  organizationId,
  gameId,
  assignmentId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  gameId: string;
  assignmentId: string;
  existing: ConfigRow | null;
  onSaved: () => void;
}) {
  const [view, setView] = React.useState<"form" | "json">("form");
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [sessionDurationMinutes, setSessionDurationMinutes] = React.useState("");
  const [maxScore, setMaxScore] = React.useState("");
  const [maxScorePerSecond, setMaxScorePerSecond] = React.useState("");
  const [verificationMode, setVerificationMode] =
    React.useState<VerificationMode>("none");
  const [callbackUrl, setCallbackUrl] = React.useState("");
  const [callbackSecret, setCallbackSecret] = React.useState("");
  const [callbackTimeoutMs, setCallbackTimeoutMs] = React.useState("");
  const [rawJson, setRawJson] = React.useState("{}");
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    if (existing) {
      const shape = existing.config as ConfigShape;

      setName(existing.name);
      setIsDefault(existing.isDefault);
      setSessionDurationMinutes(
        shape.sessionDurationSeconds === undefined
          ? ""
          : String(Math.round(shape.sessionDurationSeconds / 60)),
      );
      setMaxScore(
        shape.rules?.maxScore === undefined ? "" : String(shape.rules.maxScore),
      );
      setMaxScorePerSecond(
        shape.rules?.maxScorePerSecond === undefined
          ? ""
          : String(shape.rules.maxScorePerSecond),
      );
      setVerificationMode(shape.scoreVerification?.mode ?? "none");
      setCallbackUrl(shape.scoreVerification?.callback?.url ?? "");
      setCallbackSecret(shape.scoreVerification?.callback?.secret ?? "");
      setCallbackTimeoutMs(
        shape.scoreVerification?.callback?.timeoutMs === undefined
          ? ""
          : String(shape.scoreVerification.callback.timeoutMs),
      );
      setRawJson(JSON.stringify(existing.config, null, 2));
    } else {
      setName("");
      setIsDefault(false);
      setSessionDurationMinutes("");
      setMaxScore("");
      setMaxScorePerSecond("");
      setVerificationMode("none");
      setCallbackUrl("");
      setCallbackSecret("");
      setCallbackTimeoutMs("");
      setRawJson("{}");
    }

    setView("form");
    setJsonError(null);
  }, [open, existing]);

  const configFromView = (): Record<string, unknown> | null => {
    if (view === "form") {
      return buildConfig({
        sessionDurationMinutes,
        maxScore,
        maxScorePerSecond,
        verificationMode,
        callbackUrl,
        callbackSecret,
        callbackTimeoutMs,
      });
    }

    try {
      const parsed: unknown = JSON.parse(rawJson);

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Config must be a JSON object");
        return null;
      }

      setJsonError(null);
      return parsed as Record<string, unknown>;
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
      return null;
    }
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const config = configFromView();
    if (config === null) return;

    setBusy(true);
    try {
      const path = `/api/v1/organizations/${organizationId}/games/${gameId}/assignments/${assignmentId}/configs`;

      if (existing) {
        await apiFetch(`${path}/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), config, isDefault }),
        });
        toast.success("Config updated");
      } else {
        await apiFetch(path, {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), config, isDefault }),
        });
        toast.success("Config created");
      }

      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save config",
      );
    } finally {
      setBusy(false);
    }
  }

  const showCallbackFields =
    verificationMode === "callback" || verificationMode === "both";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
      title={existing ? "Edit config" : "New config"}
      description={
        existing
          ? undefined
          : "A config holds the session duration, the score rules, and how a score is verified."
      }
      className="w-[min(92vw,640px)] max-h-[92vh] overflow-y-auto p-0"
    >
      {existing && (
        <div className="flex items-center gap-2 border-b border-border px-6 py-3 text-xs text-muted-foreground">
          <Badge variant="muted" className="font-mono">
            revision v{existing.revision}
          </Badge>
          <span>each save increments the revision</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="config-name">Name</Label>
            <Input
              id="config-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ranked"
              required
              autoFocus
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <span className="text-muted-foreground">Default</span>
            </div>
          </div>
        </div>

        {existing && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-3 py-2.5 text-xs text-amber-100">
            <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            <p>
              Live sessions keep the config snapshot they started with. Only
              new sessions see these changes.
            </p>
          </div>
        )}

        <Tabs
          value={view}
          onValueChange={(next) => setView(next as "form" | "json")}
          items={[
            {
              value: "form",
              label: (
                <>
                  <IconForms className="size-3.5" />
                  Form
                </>
              ),
            },
            {
              value: "json",
              label: (
                <>
                  <IconBraces className="size-3.5" />
                  JSON
                </>
              ),
            },
          ]}
        />

        {view === "form" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="config-duration">Session duration (minutes)</Label>
              <Input
                id="config-duration"
                type="number"
                min={1}
                max={1440}
                value={sessionDurationMinutes}
                onChange={(event) => setSessionDurationMinutes(event.target.value)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Default 60 minutes if left empty.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="config-max-score">Max score</Label>
                <Input
                  id="config-max-score"
                  type="number"
                  min={0}
                  value={maxScore}
                  onChange={(event) => setMaxScore(event.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">
                  Scores above this are flagged, never rejected.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="config-max-rate">Max score per second</Label>
                <Input
                  id="config-max-rate"
                  type="number"
                  min={0}
                  value={maxScorePerSecond}
                  onChange={(event) => setMaxScorePerSecond(event.target.value)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Flags suspicious score velocity.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="config-verification">Score verification</Label>
              <Select
                value={verificationMode}
                onValueChange={(value) => setVerificationMode(value as VerificationMode)}
                options={[
                  { value: "none", label: "None — accept and flag" },
                  { value: "hmac", label: "HMAC — client signs each score" },
                  { value: "callback", label: "Callback — your server verifies" },
                  { value: "both", label: "Both — HMAC then callback" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {verificationMode === "none"
                  ? "Every score is stored. Rules can flag it, but it is never rejected."
                  : verificationMode === "hmac"
                    ? "Session creation returns a signing key. The client must send an HMAC-SHA256 signature."
                    : verificationMode === "callback"
                      ? "Wasanni POSTs each score to your endpoint. A false response rejects it."
                      : "The client signs the score and your server confirms it. Both must pass."}
              </p>
            </div>

            {showCallbackFields && (
              <div className="space-y-3 rounded-lg border border-border bg-white/[0.02] p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="callback-url">Callback URL</Label>
                  <Input
                    id="callback-url"
                    type="url"
                    value={callbackUrl}
                    onChange={(event) => setCallbackUrl(event.target.value)}
                    placeholder="https://your-server.example/verify"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="callback-secret">Secret</Label>
                  <Input
                    id="callback-secret"
                    value={callbackSecret}
                    onChange={(event) => setCallbackSecret(event.target.value)}
                    placeholder="A long random string"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wasanni signs the callback with this secret. Verify the
                    signature before trusting the request.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="callback-timeout">Timeout (ms)</Label>
                  <Input
                    id="callback-timeout"
                    type="number"
                    min={100}
                    max={10000}
                    value={callbackTimeoutMs}
                    onChange={(event) => setCallbackTimeoutMs(event.target.value)}
                    placeholder="3000"
                  />
                  <p className="text-xs text-muted-foreground">
                    If the callback times out, the score is accepted with the
                    verification_unavailable flag.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="config-json">Raw config</Label>
            <Textarea
              id="config-json"
              value={rawJson}
              onChange={(event) => {
                setRawJson(event.target.value);
                setJsonError(null);
              }}
              className="min-h-[300px] font-mono text-xs"
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-rose-300">{jsonError}</p>}
            <p className="text-xs text-muted-foreground">
              Unknown keys are allowed. The JSON view is the source of truth if
              both views have content.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create config"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
