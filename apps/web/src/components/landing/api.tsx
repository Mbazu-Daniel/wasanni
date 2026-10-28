import * as React from "react";
import { motion } from "motion/react";
import {
  IconCheck,
  IconCopy,
  IconTerminal2,
  IconBrandJavascript,
  IconBrandTypescript,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, ShimmerText } from "@/components/motion-kit";

const tabs = [
  {
    id: "js",
    label: "JavaScript",
    icon: IconBrandJavascript,
    code: `import { Wasanni } from "@wasanni/sdk";

const wasanni = new Wasanni({
  apiKey: process.env.WASANNI_KEY,
});

const session = await wasanni.sessions.create({
  gameId: "gam_7QH2",
  externalUserId: "u_552",
  mode: "ranked",
  tournamentId: "trn_spring",
});

const socket = wasanni.realtime(session);
socket.on("event_ack", ({ seq }) => {
  console.log("saved", seq);
});`,
  },
  {
    id: "ts",
    label: "TypeScript",
    icon: IconBrandTypescript,
    code: `import { Wasanni, type ScoreResult } from "@wasanni/sdk";

const wasanni = new Wasanni({ apiKey: process.env.WASANNI_KEY });

const session = await wasanni.sessions.create({
  gameId: "gam_7QH2",
  externalUserId: "u_552",
  mode: "ranked",
});

const result: ScoreResult = await wasanni.scores.submit({
  sessionId: session.id,
  score: 940,
  signature: sign(session.signingKey, 940),
});`,
  },
  {
    id: "curl",
    label: "cURL",
    icon: IconTerminal2,
    code: `curl -X POST https://api.wasanni.com/api/v1/platform/sessions \\
  -H "x-api-key: wsk_..." \\
  -H "content-type: application/json" \\
  -d '{
    "gameId": "gam_7QH2",
    "externalUserId": "u_552",
    "mode": "ranked",
    "tournamentId": "trn_spring"
  }'`,
  },
];

export function Api() {
  const [active, setActive] = React.useState(tabs[0]!.id);
  const [copied, setCopied] = React.useState(false);
  const current = tabs.find((tab) => tab.id === active)!;

  const copy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="api" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <Badge variant="blue">Developer surface</Badge>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              One key. One session. <ShimmerText>One socket.</ShimmerText>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The platform creates the session on its server. The API key never
              reaches the client. The game gets a short-lived token and a
              realtime address. Scores go through the same path whether they
              come from the client or the server.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "sessions",
                "scores",
                "leaderboards",
                "tournaments",
                "matches",
                "replays",
                "webhooks",
                "usage",
              ].map((item) => (
                <Badge key={item} variant="muted">
                  {item}
                </Badge>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="overflow-hidden border-border/80 bg-[#070915]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActive(tab.id)}
                      className="relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {active === tab.id && (
                        <motion.span
                          layoutId="api-tab"
                          className="absolute inset-0 rounded-lg bg-white/[0.06]"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <tab.icon className="relative size-3.5" />
                      <span className="relative">{tab.label}</span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy code">
                  {copied ? (
                    <IconCheck className="size-4 text-emerald-400" />
                  ) : (
                    <IconCopy className="size-4" />
                  )}
                </Button>
              </div>

              <div className="overflow-x-auto p-5">
                <motion.pre
                  key={current.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-[13px] leading-relaxed text-blue-soft"
                >
                  <code>{current.code}</code>
                </motion.pre>
              </div>

              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <span className="font-mono text-[10px] text-muted-foreground">
                  POST /api/v1/platform/sessions
                </span>
                <span className="font-mono text-[10px] text-emerald-400">200 · 41 ms</span>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
