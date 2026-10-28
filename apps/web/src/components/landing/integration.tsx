import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  IconCheck,
  IconCopy,
  IconTerminal2,
  IconBrandJavascript,
} from "@tabler/icons-react";
import { Reveal } from "@/components/motion-kit";

const tabs = [
  {
    id: "deploy-curl",
    label: "Deploy · cURL",
    icon: IconTerminal2,
    code: `# 1. ask for an upload target
curl -X POST https://api.wasanni.com/api/v1/organizations/org_5C4/games/gam_7QH2/files/upload \\
  -b "$DASHBOARD_SESSION" \\
  -H "content-type: application/json" \\
  -d '{
    "filename": "drift-kings.zip",
    "version": "1.4.2",
    "kind": "bundle",
    "entryPoint": "index.html",
    "crossOriginIsolation": true
  }'

# 2. put the zip straight to the bucket, then confirm and publish
curl -T dist/drift-kings.zip "$UPLOAD_URL"
curl -X POST .../games/gam_7QH2/files/gfl_2M9/complete
curl -X POST .../games/gam_7QH2/publish`,
  },
  {
    id: "deploy-js",
    label: "Deploy · Node",
    icon: IconBrandJavascript,
    code: `const target = await fetch(
  "https://api.wasanni.com/api/v1/organizations/org_5C4/games/gam_7QH2/files/upload",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "drift-kings.zip",
      version: "1.4.2",
      kind: "bundle",
      entryPoint: "index.html",
      crossOriginIsolation: true,
    }),
  },
).then((r) => r.json());

await fetch(target.upload.url, { method: "PUT", body: zip });
await fetch(
  "https://api.wasanni.com/api/v1/organizations/org_5C4/games/gam_7QH2/files/gfl_2M9/complete",
  { method: "POST" },
);

// https://wasanni.com/play/gam_7QH2/gfl_2M9/index.html`,
  },
  {
    id: "play-curl",
    label: "Play · cURL",
    icon: IconTerminal2,
    code: `# open a session for a player
curl -X POST https://api.wasanni.com/api/v1/sessions \\
  -H "x-api-key: wsk_..." \\
  -H "content-type: application/json" \\
  -d '{
    "gameId": "gam_7QH2",
    "externalUserId": "u_552",
    "mode": "ranked",
    "tournamentId": "trn_spring"
  }'

# the client gets sessionToken + realtimeUrl; the key never ships
curl -X POST https://api.wasanni.com/api/v1/sessions/7QH2M9XK4C/score \\
  -H "authorization: Bearer $SESSION_TOKEN" \\
  -d '{"value": 18420, "events": 12}'`,
  },
  {
    id: "play-js",
    label: "Play · Node",
    icon: IconBrandJavascript,
    code: `const { session, sessionToken, realtimeUrl } = await fetch(
  "https://api.wasanni.com/api/v1/sessions",
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.WASANNI_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      gameId: "gam_7QH2",
      externalUserId: "u_552",
      mode: "ranked",
      tournamentId: "trn_spring",
    }),
  },
).then((r) => r.json());

// hand sessionToken to the client, connect realtimeUrl, post the score.`,
  },
];

const steps = [
  {
    no: "1",
    title: "Create your workspace",
    body: "Add the platform your game runs on and mint its key. The dashboard is your developer control room.",
  },
  {
    no: "2",
    title: "Deploy a build",
    body: "Ask for an upload target, PUT the bundle, confirm it, publish it. It comes back as a /play URL for that exact build.",
  },
  {
    no: "3",
    title: "Run the competition",
    body: "Register players by your own user IDs. Sessions, scores, leaderboards, brackets, and replays fill themselves in.",
  },
];

const specs = [
  ["Builds", "A zip bundle or a single file, up to 5 GB, versioned by you"],
  ["Engines", "Godot, Unity WebGL, HTML5 — anything that runs in a browser tab"],
  ["Play URL", "/play/:gameId/:fileId/*, served with the headers threaded builds need"],
  ["Auth", "One API key per platform on your server; short-lived session tokens on the client"],
  ["Players", "Your user IDs. We never own the account."],
  ["Data", "Every score keeps the flags computed against it; nothing is deleted to hide it"],
];

export function Integration() {
  const [active, setActive] = React.useState(tabs[0]!.id);
  const [copied, setCopied] = React.useState(false);
  const reduce = useReducedMotion();
  const current = tabs.find((tab) => tab.id === active)!;

  const copy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="integration" className="scroll-mt-20 border-b border-mist/15">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="font-poster text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-chalk sm:text-5xl">
            Deploy the build. <span className="text-signal">Call the game.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-chalk/85">
            Your team owns the game and the player account. Wasanni handles the
            hosted build, short-lived play sessions, realtime connection, and
            competition state through plain HTTPS. If you can send a POST, you
            can put a game online.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-2xl border border-mist/15 bg-mist/12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.no} className="bg-abyss p-7">
              <span className="grid size-10 place-items-center rounded-xl border border-signal/25 bg-signal/12 font-poster text-xl font-black text-signal">
                {step.no}
              </span>
              <h3 className="mt-4 font-poster text-2xl font-bold uppercase text-chalk">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="panel overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-mist/15 bg-night/40 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActive(tab.id)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
                      active === tab.id
                        ? "bg-signal text-night"
                        : "text-mist hover:text-chalk"
                    }`}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={copy}
                aria-label={copied ? "Code copied" : `Copy the ${current.label} snippet`}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-mist/30 text-mist transition-colors hover:border-signal hover:text-signal"
              >
                {copied ? (
                  <IconCheck className="size-4 text-signal" />
                ) : (
                  <IconCopy className="size-4" />
                )}
              </button>
            </div>
            <div className="overflow-x-auto p-5">
              <motion.pre
                key={current.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="font-mono text-[13px] leading-relaxed text-chalk/85"
              >
                <code>{current.code}</code>
              </motion.pre>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <p className="border-b border-mist/15 bg-night/40 px-5 py-3 font-poster text-xl font-black uppercase text-signal">
              Spec sheet
            </p>
            <dl className="divide-y divide-mist/12 px-5">
              {specs.map(([term, value]) => (
                <div key={term} className="py-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-chalk/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
