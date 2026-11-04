import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  IconCheck,
  IconCopy,
  IconTerminal2,
  IconBrandJavascript,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Reveal } from "@/components/motion-kit";

const tabs = [
  {
    id: "deploy-curl",
    label: "Deploy · cURL",
    icon: IconTerminal2,
    code: `# 1. ask the dashboard for an upload target
curl -X POST https://api.wasanni.com/api/v1/organizations/$ORG_ID/games/$GAME_ID/files/upload \\
  -b "$DASHBOARD_SESSION" \\
  -H "content-type: application/json" \\
  -d '{
    "filename": "drift-kings.zip",
    "version": "1.4.2",
    "contentType": "application/zip",
    "sizeBytes": 41843332,
    "kind": "bundle",
    "entryPoint": "index.html",
    "crossOriginIsolation": true
  }'

# 2. PUT the zip to target.upload.url, with target.upload.headers
curl -T dist/drift-kings.zip "$UPLOAD_URL"

# 3. confirm the file, publish the game
curl -X POST .../games/$GAME_ID/files/$FILE_ID/complete -b "$DASHBOARD_SESSION"
curl -X POST .../games/$GAME_ID/publish -b "$DASHBOARD_SESSION"

# the build is live at https://wasanni.com/play/$GAME_ID/$FILE_ID/index.html`,
  },
  {
    id: "verify-curl",
    label: "Verify · cURL",
    icon: IconShieldCheck,
    code: `# put a referee on the ranked mode of a game
curl -X POST https://api.wasanni.com/api/v1/organizations/$ORG_ID/games/$GAME_ID/assignments/$ASSIGNMENT_ID/configs \\
  -H "x-api-key: sk_org_..." \\
  -H "content-type: application/json" \\
  -d '{
    "name": "ranked",
    "isDefault": true,
    "config": { "scoreVerification": { "mode": "vision" } }
  }'

# mode "callback" instead hands the call to your own server:
#   "scoreVerification": {
#     "mode": "callback",
#     "callback": { "url": "https://api.yourgame.com/wasanni/verify", "secret": "..." }
#   }

# what that endpoint receives, signed with your secret
# POST  x-wasanni-verify-timestamp: 1762158000
#       x-wasanni-verify-signature: t=1762158000,v1=<hmac_sha256>
#       {"event":"score.verify","sessionId":"...","externalUserId":"u_552",
#        "score":18420,"submittedAt":"2026-11-03T09:14:22.000Z"}

# the two answers it can give
{ "valid": true }
{ "valid": false, "reason": "round 12 never happened in the replay" }`,
  },
  {
    id: "play-js",
    label: "Play · Node",
    icon: IconBrandJavascript,
    code: `// your server, holding the platform key
const { session, sessionToken, realtimeUrl } = await fetch(
  "https://api.wasanni.com/api/v1/sessions",
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.WASANNI_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      gameId: "0194f2a7-8c3e-7a1b-9d2c-4f6b8e0a1c22",
      platformId: "0194f2a7-8c3e-7a1b-9d2c-4f6b8e0a1c23",
      externalUserId: "u_552",
      mode: "ranked",
      tournamentId: "0194f2a7-8c3e-7a1b-9d2c-4f6b8e0a1c24",
    }),
  },
).then((r) => r.json());

// sessionToken is short-lived and player-scoped. The key never ships.`,
  },
  {
    id: "score-curl",
    label: "Score · cURL",
    icon: IconTerminal2,
    code: `# the game client posts its own score through the play door
curl -X POST https://api.wasanni.com/api/v1/play/sessions/$SESSION_ID/score \\
  -H "authorization: Bearer $SESSION_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{
    "score": 18420,
    "endSession": true,
    "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  }'

# 201, and the verdict travels with the score
# {"score":{
#    "status":"accepted","flagged":false,
#    "flags":["client_source","vision_verified"],
#    "verificationStatus":"passed","verificationReason":null}}

# your server reads the board; a flagged run stays out until asked for
curl "https://api.wasanni.com/api/v1/games/$GAME_ID/leaderboards?platformId=$PLATFORM_ID" \\
  -H "x-api-key: sk_org_..."`,
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
    title: "Put on a referee",
    body: "Per mode: trust the number, call back your own verifier, or read the score off the attached frame. The verdict is stored with the score.",
  },
  {
    no: "4",
    title: "Run the competition",
    body: "Register players by your own user IDs. Sessions, scores, leaderboards, brackets, and replays fill themselves in.",
  },
];

const specs = [
  ["Builds", "A zip bundle or a single file, up to 5 GB, versioned by you"],
  ["Engines", "Godot, Unity WebGL, HTML5: anything that runs in a browser tab"],
  ["Play URL", "/play/:gameId/:fileId/*, served with the headers threaded builds need"],
  ["Auth", "One API key per platform on your server; short-lived session tokens on the client"],
  ["Players", "Your user IDs. We never own the account."],
  ["Verification", "None, your HMAC-signed callback, or a frame read against the submitted number"],
  ["Referee", "A verdict you can read: every score carries its status and the reason it earned"],
  ["Honesty", "A slow referee costs you no rank. The player is not punished for the referee"],
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
    <section id="integration" className="launch-integration scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="font-poster text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-chalk sm:text-5xl">
            Deploy the build. <span className="text-signal">Call the game.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-chalk/85">
            Your team owns the game and the player account. Wasanni handles the
            hosted build, short-lived play sessions, realtime connection, and
            competition state through plain HTTPS. Every score comes back with
            the verdict computed against it, so a board you can defend is one
            POST away. If you can send a POST, you can put a game online.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-2xl border border-mist/15 bg-mist/12 md:grid-cols-2 lg:grid-cols-4">
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
