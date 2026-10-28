import { Link } from "@tanstack/react-router";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBolt,
  IconDeviceGamepad2,
  IconPlayerPlay,
  IconTrophy,
} from "@tabler/icons-react";

const capabilities = [
  {
    number: "01",
    title: "Put it online",
    body: "Upload a Godot, Unity WebGL, or HTML5 build. Get a versioned play URL without standing up hosting yourself.",
    icon: IconDeviceGamepad2,
  },
  {
    number: "02",
    title: "Make it a game",
    body: "Open sessions, keep player identity in your system, and send scores through an API built for browser games.",
    icon: IconBolt,
  },
  {
    number: "03",
    title: "Build the scene",
    body: "Leaderboards, tournaments, replays, and signed webhooks turn a playable build into a place people return to.",
    icon: IconTrophy,
  },
];

const audience = [
  {
    label: "FOR GAME MAKERS",
    title: "Ship the game, not the plumbing.",
    body: "Keep your engine, code, and player accounts. Wasanni handles the hosted build and the competitive layer around it.",
    accent: "lime",
  },
  {
    label: "FOR GAME PLATFORMS",
    title: "Give every game a scene.",
    body: "One integration for the catalog: shared identity, sessions, verified scores, brackets, and replays across your games.",
    accent: "coral",
  },
];

export function Launchpad() {
  return (
    <div className="launchpad min-h-screen overflow-x-clip">
      <header className="launch-nav">
        <div className="launch-shell launch-nav-inner">
          <Link to="/" className="launch-wordmark" aria-label="Wasanni home">
            <span className="launch-mark">W</span>
            <span>Wasanni</span>
          </Link>
          <nav className="launch-links" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#platform">Platform</a>
            <a href="#competition">Competition</a>
            <Link to="/docs">Docs</Link>
          </nav>
          <div className="launch-nav-actions">
            <Link to="/sign-in" className="launch-sign-in">Sign in</Link>
            <Link to="/sign-up" className="launch-small-button">
              Start building <IconArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="launch-hero">
          <div className="launch-shell launch-hero-grid">
            <div className="launch-hero-copy">
              <div className="launch-kicker"><span /> THE HOME FOR YOUR NEXT GAME</div>
              <h1>Build it.<br /><em>Play it.</em><br />Bring a crowd.</h1>
              <p className="launch-hero-lede">
                Wasanni is the developer platform for hosting browser games and building the competitive world around them.
              </p>
              <div className="launch-hero-actions">
                <Link to="/sign-up" className="launch-primary-button">
                  Host your first game <IconArrowUpRight className="size-5" />
                </Link>
                <a href="#how-it-works" className="launch-text-link">
                  See how it works <IconArrowDownRight className="size-4" />
                </a>
              </div>
              <p className="launch-proof"><span className="launch-status-dot" /> PUBLIC BETA · NO CREDIT CARD · YOUR GAME, YOUR PLAYERS</p>
            </div>

            <div className="launch-hero-art" aria-label="A preview of a hosted browser game">
              <div className="launch-art-sticker launch-art-sticker-top">PLAYABLE<br />IN A URL</div>
              <div className="launch-game-window">
                <div className="launch-game-topbar">
                  <span className="launch-window-dots"><i /><i /><i /></span>
                  <span className="launch-game-url">wasanni.com/play/drift-kings</span>
                  <span className="launch-live-pill">LIVE</span>
                </div>
                <div className="launch-game-screen">
                  <div className="launch-game-skyline"><span /><span /><span /><span /><span /></div>
                  <div className="launch-game-sun" />
                  <div className="launch-game-grid" />
                  <div className="launch-game-player launch-player-one"><span /></div>
                  <div className="launch-game-player launch-player-two"><span /></div>
                  <div className="launch-game-hud launch-hud-score"><small>SCORE</small><strong>18,420</strong></div>
                  <div className="launch-game-hud launch-hud-time"><small>TIME</small><strong>01:42</strong></div>
                  <div className="launch-game-title">DRIFT<br /><b>KINGS</b></div>
                  <div className="launch-game-prompt"><IconPlayerPlay className="size-3.5" /> PRESS TO PLAY</div>
                </div>
                <div className="launch-game-footer"><span>BUILD 1.4.2</span><span>RANKED SESSION</span><span>● 128 PLAYERS</span></div>
              </div>
              <div className="launch-art-sticker launch-art-sticker-bottom">ONE BUILD<br /><strong>ENDLESS<br />POSSIBILITIES</strong></div>
            </div>
          </div>
          <div className="launch-scribble" aria-hidden="true">↘</div>
        </section>

        <section className="launch-marquee" aria-label="Platform capabilities">
          <div className="launch-marquee-track">
            <span>HOST THE BUILD</span><b>✳</b><span>RUN THE SESSION</span><b>✳</b><span>START THE COMPETITION</span><b>✳</b><span>HOST THE BUILD</span><b>✳</b><span>RUN THE SESSION</span><b>✳</b><span>START THE COMPETITION</span>
          </div>
        </section>

        <section id="how-it-works" className="launch-section launch-how">
          <div className="launch-shell">
            <div className="launch-section-intro">
              <div className="launch-kicker"><span /> FROM BUILD TO BATTLE</div>
              <h2>Everything your game needs<br /><em>after the export.</em></h2>
              <p>Skip the week of wiring. Wasanni gives your game a place to live, a way to compete, and a reason for players to come back.</p>
            </div>
            <div className="launch-capability-grid">
              {capabilities.map((capability) => {
                const Icon = capability.icon;

                return (
                <article key={capability.number} className="launch-capability">
                  <div className="launch-capability-top"><span>{capability.number}</span><Icon className="size-6" /></div>
                  <h3>{capability.title}</h3>
                  <p>{capability.body}</p>
                  <span className="launch-card-arrow"><IconArrowUpRight className="size-5" /></span>
                </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="platform" className="launch-section launch-platform">
          <div className="launch-shell launch-platform-grid">
            <div className="launch-platform-copy">
              <div className="launch-kicker launch-kicker-coral"><span /> THE DEVELOPER LOOP</div>
              <h2>Your build in.<br /><em>Your world out.</em></h2>
              <p>Deploy a versioned bundle, get a URL, and call the platform from the game you already made. The key stays on your server. The player stays yours.</p>
              <Link to="/sign-up" className="launch-outline-button">Create a workspace <IconArrowUpRight className="size-4" /></Link>
            </div>
            <div className="launch-terminal" aria-label="Example Wasanni deployment workflow">
              <div className="launch-terminal-head"><span><i /><i /><i /></span><b>deploy-game.ts</b><span className="launch-terminal-tag">WASANNI API</span></div>
              <pre><code><span className="code-muted">const</span> <span className="code-lime">game</span> = <span className="code-purple">await</span> wasanni.games.deploy({`{`}
  <span className="code-key">build</span>: <span className="code-coral">"dist/drift-kings.zip"</span>,
  <span className="code-key">version</span>: <span className="code-coral">"1.4.2"</span>,
  <span className="code-key">entryPoint</span>: <span className="code-coral">"index.html"</span>
{`}`});

<span className="code-muted">console</span>.log(game.playUrl);
<span className="code-result">→ https://wasanni.com/play/drift-kings</span></code></pre>
              <div className="launch-terminal-foot"><span className="launch-status-dot" /> DEPLOYED IN YOUR WORKSPACE <span>●</span> PLAY URL READY</div>
            </div>
          </div>
        </section>

        <section id="competition" className="launch-section launch-competition">
          <div className="launch-shell launch-competition-grid">
            <div className="launch-leaderboard" aria-label="Example leaderboard">
              <div className="launch-leaderboard-head"><div><span className="launch-mini-label">DRIFT KINGS / PIXEL CUP</span><h3>THE RACE IS ON</h3></div><span className="launch-live-pill">OPEN</span></div>
              <div className="launch-leaderboard-tabs"><span className="active">LEADERBOARD</span><span>BRACKET</span><span>REPLAYS</span></div>
              <div className="launch-rank-row launch-rank-first"><strong>01</strong><span className="launch-avatar avatar-yellow">T</span><div><b>Tunde</b><small>PERSONAL BEST</small></div><em>12,840</em></div>
              <div className="launch-rank-row"><strong>02</strong><span className="launch-avatar avatar-purple">A</span><div><b>Ada</b><small>NEW RECORD</small></div><em>11,920</em></div>
              <div className="launch-rank-row"><strong>03</strong><span className="launch-avatar avatar-coral">K</span><div><b>Kai</b><small>LAST RUN · 2M AGO</small></div><em>10,540</em></div>
              <div className="launch-rank-row"><strong>04</strong><span className="launch-avatar avatar-lime">N</span><div><b>Noor</b><small>PERSONAL BEST</small></div><em>9,870</em></div>
              <div className="launch-leaderboard-foot"><span>6 PLAYERS</span><span>BEST SCORE PER PLAYER</span><span className="launch-foot-signal">● SYNCED</span></div>
            </div>
            <div className="launch-competition-copy">
              <div className="launch-kicker"><span /> MAKE IT A SCENE</div>
              <h2>A playable game is good.<br /><em>A living game is better.</em></h2>
              <p>Sessions, verified scores, leaderboards, tournaments, and replays come from one API. Give players a reason to chase the next run.</p>
              <div className="launch-feature-list"><span><b>✓</b> Verified scores</span><span><b>✓</b> Bracket tournaments</span><span><b>✓</b> Replay-ready sessions</span><span><b>✓</b> Signed webhooks</span></div>
            </div>
          </div>
        </section>

        <section className="launch-section launch-audience">
          <div className="launch-shell">
            <div className="launch-audience-intro"><div className="launch-kicker launch-kicker-coral"><span /> MADE FOR THE PEOPLE SHIPPING</div><h2>Pick your<br /><em>starting line.</em></h2></div>
            <div className="launch-audience-grid">
              {audience.map((item) => (
                <article key={item.label} className={`launch-audience-card launch-audience-${item.accent}`}>
                  <span className="launch-mini-label">{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><IconArrowUpRight className="launch-audience-arrow size-6" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="launch-final-cta">
          <div className="launch-shell launch-final-inner">
            <div className="launch-final-shape launch-final-shape-one" /><div className="launch-final-shape launch-final-shape-two" />
            <div className="launch-kicker"><span /> YOUR NEXT BUILD STARTS HERE</div>
            <h2>Make something<br /><em>worth returning to.</em></h2>
            <p>Host the game. Ship the scene. Wasanni is in public beta.</p>
            <Link to="/sign-up" className="launch-primary-button launch-primary-dark">Start building for free <IconArrowUpRight className="size-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="launch-footer">
        <div className="launch-shell launch-footer-inner"><Link to="/" className="launch-wordmark"><span className="launch-mark">W</span><span>Wasanni</span></Link><p>THE PLATFORM YOUR GAME LANDS ON.</p><div><Link to="/sign-in">Sign in</Link><Link to="/sign-up">Start building</Link></div></div>
        <div className="launch-shell launch-footer-bottom"><span>© {new Date().getFullYear()} WASANNI</span><span>PUBLIC BETA</span><span>BUILT FOR THE NEXT RUN</span></div>
      </footer>
    </div>
  );
}
