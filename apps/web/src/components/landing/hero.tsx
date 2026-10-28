import { Link } from "@tanstack/react-router";

const requestLines = [
  { text: "POST /api/v1/organizations/org_5C4/games/", request: true },
  { text: "     gam_7QH2/files/upload", request: true },
  { text: "cookie: your dashboard session", request: false },
  { text: "", request: false },
  { text: "{", request: false },
  { text: '  "filename": "drift-kings.zip",', request: false },
  { text: '  "version": "1.4.2",', request: false },
  { text: '  "kind": "bundle",', request: false },
  { text: '  "entryPoint": "index.html",', request: false },
  { text: '  "crossOriginIsolation": true', request: false },
  { text: "}", request: false },
];

const responseLines = [
  "201",
  "{",
  '  "file": { "id": "gfl_2M9", "status": "pending_upload" },',
  '  "upload": {',
  '    "method": "PUT",',
  '    "url": "https://buckets.wasanni.com/…"',
  "  }",
  "}",
];

const tailLines = [
  "PUT the zip, then POST …/files/gfl_2M9/complete and …/publish",
  "GET https://wasanni.com/play/gam_7QH2/gfl_2M9/index.html",
];

export function Hero() {
  return (
    <section className="border-b border-mist/15">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="font-poster text-[clamp(2.75rem,7vw,5.25rem)] font-black uppercase leading-[0.9] tracking-[-0.02em] text-chalk">
            Host the game.
            <br />
            <span className="text-signal">Ship the scene.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-chalk/85">
            Wasanni is the developer platform for browser games. Host a Godot,
            Unity WebGL, or HTML5 build, get a play URL, and add sessions,
            verified scores, leaderboards, tournaments, and replays without
            building the backend around every game.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/sign-up"
              className="action px-6 py-3 font-mono text-sm uppercase tracking-[0.12em]"
            >
              Start hosting a game
            </Link>
            <a
              href="#integration"
              className="action-quiet px-5 py-3 font-mono text-sm uppercase tracking-[0.12em]"
            >
              Explore the platform
            </a>
          </div>

          <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-mist">
            Public beta · Hosted builds · Competition API · Replays
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-mist/15 bg-night/40 px-5 py-4">
            <p className="font-poster text-lg font-black uppercase text-chalk">
              Build → play URL
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
              developer workflow
            </p>
          </div>
          <pre className="overflow-x-auto px-5 pt-4 font-mono text-[12.5px] leading-relaxed text-chalk/85">
            {requestLines.map((line, index) => (
              <span
                key={`${index}-${line.text}`}
                style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                className="line-in block min-h-[1.4em] whitespace-pre"
              >
                {line.request ? <span className="text-signal">{line.text}</span> : line.text}
              </span>
            ))}
          </pre>
          <div className="grow-x mx-5 my-3 h-px bg-signal/60" style={{ animationDelay: "0.8s" }} />
          <pre className="overflow-x-auto px-5 pb-4 font-mono text-[12.5px] leading-relaxed text-chalk/85">
            {responseLines.map((line, index) => (
              <span
                key={`${index}-${line}`}
                style={{ animationDelay: `${0.9 + index * 0.05}s` }}
                className="line-in block min-h-[1.4em] whitespace-pre"
              >
                {index === 0 ? (
                  <span className="font-bold text-signal">201 · the upload target</span>
                ) : (
                  line
                )}
              </span>
            ))}
          </pre>
          <div
            className="rise-in border-t border-mist/15 bg-night/40 px-5 py-3"
            style={{ animationDelay: "1.4s" }}
          >
            {tailLines.map((line) => (
              <p
                key={line}
                className="block whitespace-pre font-mono text-[11px] leading-relaxed text-chalk/80"
              >
                {line}
              </p>
            ))}
          </div>
          <p className="border-t border-mist/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
            The bundle is extracted and checked before it goes live
          </p>
        </div>
      </div>
    </section>
  );
}
