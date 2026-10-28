# PRD — Wasanni

Requirements for the competition layer for games. Each requirement is stated so
it can be checked against the running system: a route, a response, a row, or a
refusal. Where the code makes no promise, this document says so instead of
inventing one.

Companion documents: [`scope.md`](scope.md) for the boundary,
[`spec.md`](spec.md) for the technical contract,
[`GLOSSARY.md`](GLOSSARY.md) for the nouns,
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the seams.

---

## 1. Problem

A studio that ships a game to several sites has to rebuild the same competition
plumbing for each one: who is playing, what a run is worth, whether that score
is believable, where the leaderboard lives, how a bracket advances, how the site
finds out that something happened, and what it costs per month. That plumbing is
not the game, and every copy of it drifts.

Wasanni holds the plumbing once. The studio publishes the game as a bundle,
assigns it to its platforms with a config per assignment, and each platform
opens sessions and submits scores. Ranking, tournaments, matches, replays,
notifications, metering and the audit trail are the same code for every platform,
so a rule change is one write and not a migration across N integrations.

## 2. Users and jobs

| Persona | Job they hire Wasanni for | What they touch |
|---|---|---|
| **Organization owner** | run a tenant without losing it | members, invitations, custom roles, quotas, audit, export, and the last-owner guarantee |
| **Operator / admin** | ship a game and keep its competitions honest | games, bundles, assignments, configs, templates, tournaments, matches, webhooks, keys, usage |
| **Game developer** | get a score recorded and shown, with the least server work | a platform api key on their server, a session token in the client, `/api/v1/docs` and the integration guide |
| **Platform backend** | be the authority for its own players and scores | the machine surface: sessions, scores, hides, tournaments, matches, usage |
| **Player** | play, be ranked, watch a match | never sees Wasanni directly; is `external_user_id`, and sees the platform's UI over the api's reads |
| **Reviewer / auditor** | answer "who changed this, when" | `GET /api/v1/organizations/:organizationId/audit`, and the JSON export |
| **Assistant user** | do the ops work in words | the agent panel: providers, projects, sessions, runs, tool approvals, spend |

## 3. Goals

1. **One score path.** A score is recorded through the api, by the platform's
   key or by the session token, and the flags, the verification, the webhook and
   the archive all hang off that one path. Acceptance: the realtime gateway
   forwards a socket `score` message to
   `POST /api/v1/play/sessions/:sessionId/score` and never writes a score row.
2. **Tenant isolation is structural, not careful.** Acceptance: every tenant
   query takes a `Scope` from `organizationScope(principal)`, an empty
   organization id throws, and a `Principal` cannot be passed where a `Scope` is
   required because `Scope` carries `scoped: true`.
3. **A credential never has to be trusted twice.** Acceptance: an api key and a
   session token are returned exactly once, are stored only as SHA-256, and a
   revoked, disabled or expired key stops authenticating with no second check in
   the request path.
4. **A client cannot lie about a rule.** Acceptance: score flags are computed by
   the api (`client_source`, `late`, `resubmitted`, `max_score_exceeded`,
   `score_rate_exceeded`) and the submit payload carries no flag field; a score
   that breaks the config is flagged and left off the leaderboard rather than
   silently dropped.
5. **A configuration change cannot rewrite history.** Acceptance: a session
   copies its assignment's config into `config_snapshot` at create; a later
   config edit changes the flags on re-check while leaving the snapshot and the
   fact flags alone.
6. **Nothing reaches the api as bytes.** Acceptance: the avatar, the game bundle
   and the template bundle each go by presigned `PUT` and come back as a key the
   api re-reads with `HEAD` before it marks anything ready.
7. **An operator can see what it costs.** Acceptance: four metrics counted per
   organization, platform and month; a quota over ceiling returns 429 at the
   event, and storage is a gauge from ready files rather than a counter.

## 4. Non-goals

Stated because a reader will otherwise ask. See the full list in
`scope.md`.

- No payments or plan tiers; a quota is a ceiling, not a bill.
- No player accounts, no player credentials, no identity resolution between
  platforms.
- No game runtime, no server-side simulation of play.
- No teams.
- No pagination outside the leaderboard.
- No signature a client carries on a score.

## 5. Functional requirements

### Identity and tenancy

**FR-1 Sign-up and sign-in.** Email-and-password sign-up, password reset, and
Google and GitHub OAuth are served under `/api/v1/auth` by Better Auth. Sign-up
is immediate and unverified. Acceptance: `POST /api/v1/auth/sign-up/email`
returns a session; with `LOG_LEVEL=debug` and no transport configured the mail
that would have been sent is written to the log as `mail.dev`, and the reset
link can be followed from there.

**FR-2 A production deployment cannot boot without mail.** Acceptance: the auth
module refuses to start with `NODE_ENV=production` and no `sendEmail` wired,
because a reset link that goes nowhere locks the account out.

**FR-3 Self read.** `GET /api/v1/auth/me` answers with the shape our own clients
validate against; session listing and revocation are Better Auth's, not ours.

**FR-4 Membership-scoped authorization.** The tenant a request acts on comes
from `:organizationId` in the path, never from the session's active
organization. Acceptance: a member of two organizations gets a different
permission set per path, `session.activeOrganizationId` is not read for
authorization, and a non-member of the path's tenant is refused.

**FR-5 A tenant always keeps an owner.** Acceptance: removing, or letting leave,
the last active owner answers `409 conflict`; the rule lives in Better Auth's
plugin and no api route reimplements it.

**FR-6 Invitations.** An invitation is an offer to one email address, created by
a caller holding `invitation:create`, listed under the tenant, cancellable, and
accepted through `/accept-invitation.$id` in the dashboard. A duplicate answers
`409 conflict` in the same error vocabulary a feature module would produce.

**FR-7 Roles, compiled and custom.** `owner`, `admin` and `member` are compiled
from `ROLE_PERMISSIONS`; an organization may add its own roles over the same
vocabulary. Acceptance: `POST /roles` with a name that is taken answers `409`,
`owner` cannot be redefined, an unknown resource or action in a grant is refused,
a custom role replaces the compiled role of the same name inside that tenant only,
and a role the vocabulary does not know grants nothing — it produces a 403, never
an owner.

**FR-8 A member's own presentation.** `displayName` and `avatar` are per
membership, not per user. Acceptance: `GET`/`PATCH /members/me` writes them
scoped to the caller's own membership, `POST /members/me/avatar` returns a
presigned `PUT` and `PUT` accepts only a key under the caller's own prefix, so
two members of one organization can show different pictures and one user can
show a different picture in each tenant.

### Platforms and keys

**FR-9 Platforms.** Create, list, update, delete under the tenant, with the slug
unique per organization and free across tenants. Acceptance: a duplicate slug in
one organization answers `409` and the same slug in another organization
succeeds.

**FR-10 Api keys.** A key belongs to one platform and carries a
`{resource: [actions]}` grant. Acceptance: the create response is the only place
the `wsk_…` secret appears, listing never repeats it, a permission outside the
vocabulary is refused at creation, revoking a key stops it authenticating while
its row stays visible, an expired key is refused, and deleting the platform
cascades to its keys.

**FR-11 The machine surface.** Sessions, scores, hides, tournaments, matches,
configs, leaderboards and usage are callable by key alone, with every id the
call acts on in the path. Acceptance: the key's organization is the only tenant
reachable, a key used against another platform's resource answers `404`, and the
key's own grant bounds what it may do.

### Games, bundles and serving

**FR-12 Game lifecycle.** A game is `hosted` or `external` and moves
`draft` → `active` → `archived`. Acceptance: publishing a hosted game without a
`ready` file is refused, only a hosted game accepts a bundle, and archiving
stops the game taking new sessions.

**FR-13 Upload handshake.** Acceptance: the presigned `PUT` signs the declared
size and content type, so a different payload is refused by the bucket; the
complete step re-reads the object with `HEAD`, and on a mismatch deletes the
object and marks the row `failed` instead of `ready`.

**FR-14 Bundles.** A zip is a bundle whether or not the caller says so.
Acceptance: a `.zip` declared `kind: "single"` is refused, a non-zip declared
`kind: "bundle"` is refused, extraction is asynchronous with the file in
`extracting` until it is `ready`, and the entry point must sit at the root of
the zip.

**FR-15 Serving a bundle.** `/play/:gameId/:fileId/*` streams out of the bucket
through the api. Acceptance: `crossOriginIsolation: true` sends
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`, `.wasm` is served as
`application/wasm`, `.pck`/`.data`/`.mem`/`.unityweb` as
`application/octet-stream`, `Range` requests are forwarded so a large asset
loads in pieces, and `spaFallback: true` serves the entry point for a miss
without a file extension.

**FR-16 Assignments and configs.** Acceptance: an assignment pairs one game with
one platform of the same organization and cannot reach another tenant's
platform; one config per assignment is the default and a session naming no
config takes it; every write bumps `revision` and a writer that lost the race is
refused; an assignment with no config runs an empty one that accepts every score
without flags.

**FR-17 Templates.** A `game` or `tournament` template exists before it has a
bundle, keeps its live bundle while a replacement is uploaded, and swaps only
after `HEAD` confirms the object that arrived. Acceptance: a failed upload
leaves the previous bundle downloadable, and a template bundle never collides
with a game bundle because the bucket location is part of the key.

### Play and scores

**FR-18 Session create.** A platform server opens a session for one
`external_user_id` under one assignment. Acceptance: the response carries the
session id, the session token returned once, and a `realtimeUrl` with that token
already on it; the config is copied into `config_snapshot` and `expires_at`
comes from `sessionDurationSeconds` in that copy.

**FR-19 Score submit.** One session holds one score. Acceptance: a second
submission is recorded and flagged `resubmitted` while the first score stands;
a client submission arriving after `expires_at` while the row is still `active`
is recorded `late` rather than refused; after the sweep marks it `expired` the
score is refused and a `score.expired` event goes to the platform.

**FR-20 Rule flags.** Acceptance: a score above `rules.maxScore` carries
`max_score_exceeded`, a score above `rules.maxScorePerSecond` carries
`score_rate_exceeded`, either makes the score flagged, and a flagged score is
left off the leaderboard until asked for. No submit payload can set a flag.

**FR-21 Server scores bypass verification.** Acceptance:
`POST /api/v1/sessions/:sessionId/score` with a platform key records the score
without a check — that call is the platform's word for it — while a client
submission is checked according to the config.

**FR-22 Optional verification callback.** `mode: "none"` (the default) accepts
every client score with `verification_status = "not_required"`. `mode: "callback"`
posts `{ event: "score.verify", sessionId, score }` to the platform's url signed
like a webhook. Acceptance: `{ "valid": true }` stores the score `passed` with
`callback_verified`; `{ "valid": false, reason }` stores it too, `failed` and
flagged; a callback that does not answer inside `timeoutMs` stores it
`unavailable` and flagged. A game server outage never loses a score.

**FR-23 Hiding and re-checking.** Acceptance: hiding a player's scores moves
them from `accepted` to `hidden` and off every leaderboard, a `score.hidden`
event is dispatched, and changing a config queues a re-check that recomputes
only the rule flags.

**FR-24 Leaderboard.** The best score per player for one game on one platform.
Acceptance: computed as a window function rather than a query per player, paged
by `limit` and `offset`, bounded by a period, and flagged scores are excluded
unless asked for.

**FR-25 Replay.** Acceptance: the events of a session are held in Redis while it
is live and packed to the bucket after it ends, one object per organization
batch with one zstd block per session, the byte range recorded on the score row,
and the Redis events deleted only after the transaction that recorded the block
committed — so a crash repacks rather than loses. Packing is off unless
`SCORE_ARCHIVE_ENABLED` is set.

### Competition

**FR-26 Tournament lifecycle.** Acceptance: `open` is the only status that takes
registrations, seeding moves a bracket tournament to `running`, a completed
final completes the tournament and marks its winner, and cancel is refused once
it is decided.

**FR-27 Registration identity.** Acceptance: a participant is keyed on
`(tournament_id, platform_id, external_user_id)`, so registering twice returns
the existing row, a withdrawn player who registers again is revived rather than
duplicated, and `max_participants` counts registered and not registered-plus-withdrawn.

**FR-28 Bracket seeding.** Acceptance: `n` players round up to the next power of
two, the bracket has `log2(size)` rounds and `size - 1` matches, all created in
one transaction, standard seed order, and a first-round match holding one seed is
a bye completed at seed time seating that player into round two. Nothing stores
the bracket size, the round count or an edge: the next match of `(round, slot)`
is `(round + 1, floor(slot / 2))` on side `slot % 2`.

**FR-29 Match completion.** Acceptance: completing a match is one conditional
update, so a second completion changes nothing and returns the row already there;
the winner is seated with `on conflict do nothing` and only an inserted seat
activates the next match; an exact tie ends the match as a draw with no winner;
a match whose every side holds a score completes itself.

**FR-30 Score-to-match coupling without coupling failure.** Acceptance: the
score service calls the match recorder after the score row commits, behind a
caught promise, so a competition failure can never fail a score submission.

**FR-31 Standings.** Acceptance: a leaderboard tournament's standings are the
best score per registered player read by joining scores to the sessions that
named the tournament; a bracket tournament's standings are the bracket.

### Realtime

**FR-32 Upgrade and refusal.** Acceptance: `GET /rt/:sessionId?token=…` or a
`Authorization: Bearer` header carries the session token, resolved by the same
SHA-256 lookup the api uses; a bad token is refused with `401` before the socket
exists, and a token for another session, an ended session or an expired session
with `403`.

**FR-33 One room per session.** Acceptance: joining answers the room size in
`ready`, a connection belongs to exactly one room, broadcast reaches every
member including the sender, and a `session.ended` message closes the room with
`4000` after delivering.

**FR-34 Peer relay is not a replay.** Acceptance: `peer.event` reaches the other
sockets in the room and is never written as a Session Event.

**FR-35 Scale-out.** Acceptance: instances share one Redis channel, an envelope
carries `origin`, and an instance ignores its own — so a client receives each
message once whether or not the rooms are on the same process.

**FR-36 Limits and shutdown.** Acceptance: a frame above `WS_MAX_MESSAGE_BYTES`
is refused by the server before the handler sees it and closes with `1009`;
`WS_IDLE_TIMEOUT_SECONDS` is enforced by the server's own ping; and `SIGTERM`
closes every room with `1001` before accepting stops.

### Webhooks

**FR-37 Subscription.** One url per platform per event set, enable/disable,
rotate-secret and a `webhook.test` send. Acceptance: the secret is returned at
create and at rotate and never again, a duplicate url is a `409`, and a webhook
of another organization or another platform answers `404`.

**FR-38 A delivery is signed and recorded.** Acceptance: the worker posts
`x-wasanni-event-id`, `x-wasanni-event-type`, `x-wasanni-timestamp` and
`x-wasanni-signature: t=<seconds>,v1=<hex>` — the HMAC-SHA256 of
`<timestamp>.<body>` under the subscription's secret — and every attempt is a
`webhook_delivery` row with attempt number, status, response code, body and
duration. A non-2xx answer retries five times with exponential backoff; a slow
database never holds a delivery hostage, because the row is written after the
attempt and a failed write is a warning.

**FR-39 Deduplication is the receiver's job.** Acceptance: the queue's job id
throttles a race but does not survive a sweep, so `x-wasanni-event-id` is the
stable key the subscriber deduplicates on.

### Metering, audit and export

**FR-40 Counting.** Acceptance: sessions, scores, matches and tournaments each
increment one row per organization, platform and month as a single upsert after
the event; bandwidth is counted in Redis and flushed once a minute, and a minute
that cannot be written is dropped rather than refusing the file that was served.
`USAGE_METERING_ENABLED=false` stops counting and lets every check pass.

**FR-41 Quotas.** Acceptance: a monthly ceiling on one metric refuses the event
with `429` where the event happens — session create and game-file request — and
the ceiling list is readable per organization.

**FR-42 Storage as a gauge.** Acceptance: the bytes an organization holds are
computed from the ready and current game files and templates, grouped by game
and by template, so an upload and a delete cannot leave drift behind.

**FR-43 One audit row per write.** Acceptance: identity and organization writes
are recorded by Better Auth's and the plugin's hooks, and every mutating
`/api/v1` request that answered below 400 records one row derived from the URL —
`game.created`, `member.updated`. A rejected write records nothing, an
unauthenticated call records nothing, `/api/auth` is skipped because Better Auth
already writes those rows, and `session` writes are skipped because they are the
highest-volume path and none is a configuration change.

**FR-44 Audit read.** Acceptance: `GET /api/v1/organizations/:organizationId/audit`
filters on actor, action, resource, source and a `from`/`to` window, pages by
keyset on `(created_at, id)` compared after `date_trunc('milliseconds', …)` so a
page boundary inside one millisecond cannot skip rows, and is refused for a
member: `audit:read` belongs to owner and admin.

**FR-45 Export.** Acceptance: `POST /api/v1/organizations/:organizationId/export`
returns one JSON file with members, invitations, platforms, games, files,
assignments, configs, tournaments, participants, matches, sessions and scores,
each with a count, sessions and scores stopping at ten thousand rows each with
the stop stated in `limits`, and the bucket's files not part of it.

### Agents

**FR-46 Providers the tenant controls.** Acceptance: a provider row carries a
name unique in the organization, a spec, a base url, a model, an encrypted key,
a request-token ceiling and a default flag; a base url that resolves to private
space is refused unless `ALLOW_PRIVATE_OUTBOUND_URLS` is set; the model list of
a provider is read through the api and never from the client.

**FR-47 Sessions, projects and runs.** Acceptance: a session belongs to a
project, is renameable and pinnable, its turns are readable, its runs are
listed newest first, and deleting a project frees its sessions. A run ends
`succeeded`, `failed`, `refused` or `awaiting_approval`.

**FR-48 Approval is a pause, not a guess.** Acceptance: a run that reaches a
tool needing approval parks and the response stops;
`GET .../sessions/:sessionId/approvals` lists what is waiting; `POST` to the
same path with an allow or a deny resumes the run over a new SSE response and
the run does not continue past the parked call until then.

**FR-49 Spend is readable.** Acceptance: `GET .../agents/spend` totals the last
30 days for the tenant from the recorded prompt, completion and cache tokens
priced against the catalog, and `GET .../agents/runs` carries per-run cost,
tokens and duration.

**FR-50 The assistant cannot invent the api.** Acceptance: the default system
prompt directs the model to call `api_docs` for exact paths, methods and
schemas rather than guess them, and the write tools go through the same scoped
services and the same permissions the dashboard calls.

## 6. Non-functional requirements

**NFR-1 Error shape is one shape.** Every failure that leaves an app is
`{ error: { code, message, details?, requestId } }` built by `toErrorBody`, with
`code` one of `bad_request`, `unauthenticated`, `forbidden`, `not_found`,
`conflict`, `rate_limited`, `unprocessable`, `internal`. Acceptance:
`toErrorBody({ code: "nonsense" })` does not compile, and a delegated Better
Auth failure is mapped into that vocabulary instead of surfacing as a 500.

**NFR-2 One identity per request.** `requestId` and `startedAt` come from
`requestContextOf(request)`, a `WeakMap` keyed by the incoming `Request`.
Acceptance: a reader gets the context or a thrown error, never a substitute, so
a request id cannot change identity mid-request; the id is on the error body and
on the log line.

**NFR-3 Secrets at rest.** Api-key and session-token material and every webhook
and callback secret compare by SHA-256; a webhook secret is encrypted with
AES-256-GCM under `WEBHOOK_SECRET_ENCRYPTION_KEY` because HMAC needs the
plaintext, and the last four characters are kept beside it so an operator can
tell two apart. Acceptance: no plaintext is stored or logged, and re-encrypting
before deploying a new key makes that rotation harmless.

**NFR-4 Rate limiting does not become an outage.** Counts live in Redis in a
fixed window. Acceptance: a Redis that is down does not cause the request to be
refused.

**NFR-5 Audit and delivery are off the critical path.** An audit insert that
fails logs one `warn` and the request stands; a delivery row is written after
its attempt.

**NFR-6 Deployment constraints are enforced by code.** Acceptance: `isPooled`
turns prepared statements off behind PgBouncer, every app calls `preflight()`
before it connects and refuses to boot in production on the wrong Redis
`maxmemory-policy` or too low a file-descriptor limit, and pool sizes come from
`DB_POOL_MAX`, `DB_POOL_MAX_WORKER`, `DB_POOL_MAX_REALTIME`.

**NFR-7 Path safety.** Acceptance: a bucket key cannot carry a path traversal, an
object key is built from location, organization, resource segments and a uuid,
and a member cannot attach an object outside its own prefix.

**NFR-8 Dependency floor on auth.** `better-auth` is declared at `^1.6.22`
because CVE-2026-53516 (fixed 1.6.11) and CVE-2026-67327 (fixed 1.6.22) are
account takeovers below it.

**NFR-9 Versioned surface.** Client routes live under `/api/v1`, with the version
in the path so a URL copied out of `/docs` stays live. Ops probes are
unversioned and unbranded.

**NFR-10 Documentation is generated from the routes.** Acceptance: `/docs` is
one merged OpenAPI document containing Better Auth's endpoints and ours, and the
agent's `api_docs` tool reads that same document rather than a hand-maintained
copy.

## 7. How it is measured

The product measures itself with the counters it already keeps — no separate
analytics path.

| Signal | Read |
|---|---|
| Adoption of a platform | `sessions_created` and `scores_submitted` per month, and the daily breakdown for a range |
| Competition activity | `tournaments_created`, `matches_created` |
| Load and cost of serving | `bandwidth_bytes`; `wasanni_http_requests_total` on `/metrics` |
| Footprint | `GET /usage/storage`, broken down by game and template |
| Abuse | the flag mix on scores — `late`, `resubmitted`, `max_score_exceeded`, `score_rate_exceeded`, `verification_failed` |
| Integration health | `webhook_delivery` statuses, `last_failure_at` per subscription |
| Operability | audit rows per write, `429` responses per quota, agent run outcomes and spend |

## 8. Constraints and dependencies

| Constraint | Consequence |
|---|---|
| Bun ≥ 1.1, Elysia 1.x, Drizzle over Postgres, ioredis, Better Auth, BullMQ, Mastra | one runtime, one schema dialect (`t`), one queue vocabulary shared through `packages/jobs` |
| PgBouncer in transaction mode | prepared statements off when the url is pooled |
| BullMQ | Redis must keep `maxmemory-policy noeviction`, or jobs are dropped without an error |
| R2 / S3-compatible bucket | browser uploads need `PUT` and `content-type` in the bucket's CORS; the bucket cannot set the COOP/COEP headers, so the api serves the bundle |
| ZeptoMail | mail is a queue job with 4 attempts, and a production boot without a transport is refused |
| The game client is outside this repo | the realtime path and message union live in `packages/contracts` so both sides read one definition |
| `tests/` is gitignored and `tests/db/*` needs `RUN_DB_TESTS=1` and `DATABASE_URL` | a green `bun test` with no database is not a verified change |

## 9. Open decisions

These are unresolved in the code, not merely unwritten here.

1. **Game Field and Game Pass.** GLOSSARY marks both as inferred from the
   vocabulary rather than confirmed against a running feature. A feature that
   needs "fields per game" or "passes per player" must resolve the terms first.
2. **Whether one score per session stays.** `game_session_score` has a unique
   `session_id`, so a resubmission is recorded but the first score stands. A
   game that wants "best of N attempts per session" needs that constraint, and
   the leaderboard and match recorder, re-decided.
3. **Where the pagination rule breaks.** Only the leaderboard pages. The first
   collection that grows past what a client should download brings cursor
   helpers back with its tests.
4. **Whether `score.rechecked` should exist.** A re-check changes flags today and
   tells nobody; emitting it needs a delivery path the worker does not have.
5. **Webhook payload compatibility policy.** Events are named and signed; no
   version field exists, so a payload change is a breaking change for every
   subscription at once.

## 10. Definition of done for a requirement

A requirement is met when the route or job it names answers as written, the
permission it needs is in `ROLE_PERMISSIONS`, the row it writes is scoped by
`scopeTo`, the failure it produces is one of `ERROR_CODES`, the write leaves one
audit row, and `bun run typecheck` plus `bun test` pass — with `tests/db/*` run
against a real Postgres whenever the requirement touches one.
