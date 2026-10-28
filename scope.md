# SCOPE

What Wasanni is, what it does, and the list of things it will not do. Written
against the code as it is; if the two disagree, the code is what is true.

For vocabulary read [`GLOSSARY.md`](GLOSSARY.md), for how the pieces fit read
[`ARCHITECTURE.md`](ARCHITECTURE.md), for the technical contract of each
subsystem read [`spec.md`](spec.md).

---

## The product

Wasanni is the competition layer for games. An organization publishes a game,
puts it on one or more of its platforms, and lets players play it. Wasanni opens
a session per play, records the score that comes out of it, ranks those scores
into a leaderboard, groups them into tournaments with a leaderboard or a
bracket, keeps the events of a session as a replay, tells the platform's server
what happened over webhooks and a socket, and counts what the organization did
against a monthly quota.

The name is Hausa for "competition". The unit of the product is the score of one
session, because everything else — leaderboard, tournament, match, replay,
webhook, counter — is a reading of that one row.

## Who calls it

Four kinds of caller, and each is a different auth path with a different set of
permissions. Nothing in the system is in scope for a caller that is not one of
these four.

| Caller | Credential | What it may do |
|---|---|---|
| **Member** — a person in the dashboard | session cookie, plus `:organizationId` in the path | configure the tenant: members, roles, platforms, keys, games, files, assignments, configs, templates, tournaments, matches, webhooks, usage, quotas, audit, export, agents |
| **Platform server** — the organization's own backend | `x-api-key` (a `wsk_` secret) | the machine surface: create sessions, record scores, read and hide scores, run tournaments and matches, read configs and leaderboards, read usage — scoped to the key's platform and limited to the permissions on the key row |
| **Game client** — code running in the browser | session token returned once at session create | send the score of its own session, and hold the socket of its own session |
| **External agent** — a MCP-speaking client | one platform api key | call the platform surface as tools over stdio (`apps/mcp`) |

## In scope

### 1. Tenancy and identity
Organizations, members, invitations, roles, permissions. Better Auth owns the
credential flows and the four global identity tables (`user`, `session`,
`account`, `verification`); Wasanni owns everything below them: the
organization scope every query passes through, the permission vocabulary, the
custom roles an organization adds to the three compiled ones, and the last-owner
rule that keeps a tenant from locking itself out.

### 2. Platform access
Platforms (one per game site an organization runs, slug unique per
organization) and the api keys issued to them. A key's secret is returned once,
only its SHA-256 is stored, and its grant is the same `{resource: [actions]}`
shape a role carries. Revocation switches a key off and keeps the row.

### 3. Games, bundles and serving
Games as `hosted` or `external`, draft → active → archived, with the rule that a
hosted game cannot be published without a `ready` file. Bundle upload by
presigned `PUT` with the size and content type inside the signature, a
`HEAD`-confirmed completion step, worker-side unzip of a bundle into a prefix,
and the api itself streaming the files of a bundle at
`/play/:gameId/:fileId/*` with the two headers that make
`self.crossOriginIsolated` true, correct content types, `Range` forwarding and
an optional SPA fallback. Templates as reusable bundles of the same shape.

### 4. Assignments and configs
One game on one platform is the unit that carries the rules: session duration,
score rules (`maxScore`, `maxScorePerSecond`), and the score-verification block.
One default per assignment, one `revision` per write, and a writer that lost the
race is refused.

### 5. Play
Game sessions: created by a platform server, resolved against the assignment's
config and frozen into `config_snapshot`, given an `expires_at` from that config
and a session token that is the client's only capability. Scores: one per
session, first one stands, a second submission is recorded as a resubmission.
Flags computed by the api and never chosen by the client. Leaderboard as the
best score per player per game per platform, paged by `limit`/`offset`. Replays
as the events of a session, packed to the bucket. Sessions swept to `expired`
when the hour passes.

### 6. Competition
Tournaments in two formats — `leaderboard` and `bracket` — with the status
machine `draft` → `open` → `running` → `completed`/`cancelled`. Participants
identified by `(tournament_id, platform_id, external_user_id)`, so a duplicate
registration returns the existing row and a withdrawn player who returns is
revived. Bracket seeded in one transaction, derived rather than stored, byes
completed at seed time. Matches with two seated sides, completed by one
conditional update, and self-completing when the scores of both sides exist.
Advancement that seats a winner into one position and takes it once. Standings
as either the ranked rows of a leaderboard or the bracket itself.

### 7. Realtime
A second entrypoint on its own port that serves nothing but the upgrade and two
probes. One room per game session, authenticated by the same session token the
api reads. `message` inbound; `ready`, `pong`, `score.recorded`, `peer.event`,
`session.ended` and `error` outbound. Scores are forwarded to the api rather
than written by the gateway. A Redis channel bridges instances, with an `origin`
field as the loop guard. Frame size and idle timeout enforced by Bun's own
options. Rooms closed with `1001` on `SIGTERM`.

### 8. Webhooks
One platform's subscription to one event stream: `score.submitted`,
`score.expired`, `score.hidden`, `session.created`, `session.ended`,
`webhook.test`. The secret is an HMAC key, so it is encrypted rather than
hashed, and returned only at create and rotate. Deliveries are attempted by the
worker, signed `t=<seconds>,v1=<hex>` over `<timestamp>.<body>`, retried five
times with exponential backoff, and recorded per attempt with the response code,
body and duration.

### 9. Background work
Four BullMQ queues — `webhooks`, `email`, `archive`, `default` — owned by
`packages/jobs` so the api and the worker agree on a job's shape without either
importing the other. In scope: webhook delivery, mail, score archive packing,
score re-check after a config change, game-bundle extraction, score partition
ensure and archive, usage flush from Redis, and the sweeps of expired sessions
and expired identity rows.

### 10. Usage, quotas and metering
Counters for `sessions_created`, `scores_submitted`, `matches_created` and
`tournaments_created`, one row per organization, platform and month, written as
one upsert after the event. Bandwidth counted in Redis at file-serving time and
flushed once a minute. Monthly ceilings that refuse the event with a 429.
Storage bytes as a gauge computed from the ready files and templates, never a
counter. A daily breakdown that fills empty days with zero, a storage breakdown
by game and template, and a per-organization quota set.

### 11. Audit and export
One immutable row per write, from three seams: Better Auth's database hooks, the
organization plugin's hooks, and one `onAfterResponse` plugin that sees every
mutating `/api/v1` request that answered below 400. A keyset-paged read filtered
on actor, action, resource, source and a time window. `organization:update`
earns a JSON export of every row the tenant owns, with the ten-thousand-row cap
on sessions and scores stated in the file.

### 12. Agents
An in-dashboard assistant backed by Mastra over Postgres storage in its own
`mastra` schema. Organization-scoped model providers (base url, model, an
encrypted key, a token ceiling, a default flag), projects, sessions with named
and pinned turns, runs with the four statuses `succeeded` / `failed` /
`refused` / `awaiting_approval`, a tool-catalogue of specs and models, and a
30-day spend read priced from the catalog. Tools that read (api docs, the
integration guide, games, platforms, leaderboards, matches, standings) and tools
that write (deploy a game, create/open/register/seed/cancel a tournament, start
and complete a match, record a score). A run that reaches a tool needing
approval parks, and the client answers over a second SSE request. Any outbound
url a provider or a callback uses is resolved and refused if it points at
private space unless `ALLOW_PRIVATE_OUTBOUND_URLS` says otherwise.

### 13. The dashboard and the docs
One TanStack Start app: marketing at `/landing`, the tenant under
`/$orgSlug`, client-rendered, with pages for overview, games, platforms, keys,
webhooks, assignments and their config editor, templates, tournaments, matches,
usage, audit, agents and settings. A command palette and keyboard shortcuts as
the one place every page and action is reachable. `/docs` as a single OpenAPI
document that contains Better Auth's endpoints and ours, `/llms.txt` and
`/api/v1/docs` as the machine-readable and human-readable integration guides.

### 14. Operations
`/healthz` and `/readyz` on every app, `/metrics` as Prometheus text, structured
logging with one `requestId` per request, `preflight()` proving Redis policy and
file-descriptor limits before any app connects, pool sizing behind PgBouncer,
and migrations as generated SQL reviewed by hand.

## Out of scope

The first three are recorded in `ARCHITECTURE.md`; all of them are statements
about the code, not wishes.

- **No payments, billing or plans.** A quota caps a metric and returns 429.
  Nothing in the system knows about money, invoices, cards or a plan tier, and
  no table holds one.
- **No game runtime.** Wasanni serves a bundle and its headers; it does not run
  the game, host a match, or arbitrate gameplay. The score is what arrives.
- **No player accounts.** A player is `external_user_id`, the platform's own id
  for them. Wasanni never signs a player up, never stores a player credential,
  and never decides whether two external ids are the same person.
- **No teams.** The organization plugin's `teams` option is not passed, so no
  team table is generated and no `teamId` column appears on `invitation`.
- **No better-auth dynamic access control.** The roles are ours:
  one table, one resolution, one `requirePermission`.
- **No pagination beyond the leaderboard.** Every other collection route returns
  an unbounded array. `kit`'s cursor and limit helpers were removed with that
  decision and come back only with the collection that needs them.
- **No session-management routes of our own.** Better Auth already serves
  `list-sessions`, `revoke-session` and `revoke-other-sessions`; `/api/v1/auth`
  carries `GET /me` and nothing else that our clients validate against.
- **No replay of a running session.** The gateway relays a client's message to
  its room-mates and does not record the relay as a Session Event, so a replay
  is the events a client posted to the api.
- **No `score.rechecked` event.** The recheck processor changes flags and tells
  nobody; the event vocabulary holds the events the api emits.
- **No webhook delivery inside the api.** The api owns the subscription and the
  dispatcher; the worker owns the attempt.
- **No client-side score signature.** The session token is the whole capability.
  Judging a score is the config's callback, or the platform's own word when it
  submits through the api-key surface.
- **No email verification as a gate.** `requireEmailVerification` is off, so
  sign-up is immediate and only the reset link and the invitation send mail.
- **No bytes through the api.** Avatars, game bundles and template bundles reach
  the bucket by presigned `PUT`; the api records a key.
- **No second path for a seam.** A second way to scope a tenant, to name a
  permission, to serialize an error, to sign a url, or to write an audit row is
  a review failure, not an option.

## Boundaries of ownership

| Thing | Owner | What Wasanni holds |
|---|---|---|
| Passwords, session tokens, cookie signing, OAuth, auth rate limits | Better Auth | the config, the `generateId` call, the plugin list, and the two member columns it cannot write |
| Object bytes | R2 / S3-compatible bucket | the object key, the declared size and content type, and the `HEAD` that confirms them |
| Player identity | the platform | `external_user_id` as an opaque string |
| Game execution | the browser | nothing but the served bundle and its headers |
| Score truth | the platform, or its verification callback | the row, the flags, the verification status, and the leaderboard that reads them |
| Delivery attempts | the worker | the subscription, the secret, the queue and the delivery rows |

## Scale the code is written against

| Fact | Value | Source |
|---|---|---|
| Max declared game bundle | 209,715,200 bytes default, up to 5,368,709,120 | `DEFAULT_STORAGE_MAX_GAME_BUNDLE_BYTES`, `STORAGE_MAX_GAME_BUNDLE_BYTES_RANGE` |
| Bundle extraction ceilings | 1 GiB uncompressed, 20,000 files | `DEFAULT_GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES`, `DEFAULT_GAME_BUNDLE_MAX_FILES` |
| Upload url lifetime | 900 s | `DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS` |
| Download url lifetime | 3600 s | `DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS` |
| Rate limits | 120 scores/min, 600 sessions/min, 1–100,000 configurable | `DEFAULT_SCORE_RATE_LIMIT_PER_MINUTE`, `DEFAULT_SESSION_RATE_LIMIT_PER_MINUTE` |
| Leaderboard | the only paged collection | `ARCHITECTURE.md` |
| Export | sessions and scores stop at 10,000 rows each, and say so in `limits` | `README.md` |
| Agent run | 8 steps, 120 s, 20 turns of history, 500 listed models, 32,000 request tokens default | `apps/api/src/modules/agent/constants.ts` |
| Webhook retries | 5 attempts, 5 s exponential with 20% jitter | `packages/jobs` |
| Mail retries | 4 attempts, 3 s exponential with 20% jitter | `packages/jobs` |

## How a capability enters scope

1. It is named in `GLOSSARY.md` before it is named in code. A noun that needs a
   verb to explain it is two entities.
2. It gets a feature folder under `apps/api/src/modules/` — not a module in
   `kit`. `kit` holds what the workspace shares and nothing a feature owns.
3. Its vocabulary lives in `packages/contracts`: `RESOURCES`, `ACTIONS`,
   `ROLE_PERMISSIONS`, `PERMISSION`.
4. Every route it adds hangs off `/api/v1/organizations/:organizationId` if a
   human reads or writes a tenant row, and off the machine surface if a key does.
5. It reuses the seams. If it needs a new one, that is the decision that gets
   reviewed.
