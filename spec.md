# SPEC

The technical contract of Wasanni: what each subsystem guarantees, in what
shape, and where. Written against the code; where the code and this file
disagree, the code is true and this file is the bug.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the reasoning behind the seams and
[`GLOSSARY.md`](GLOSSARY.md) for the nouns. [`scope.md`](scope.md) is the
boundary, [`prd.md`](prd.md) the requirements.

---

## 1. System shape

| Path | Package | Runtime | Owns |
|---|---|---|---|
| `apps/api` | `@wasanni/api` | Bun + Elysia, `PORT` (default 3000) | `/api/v1` routes, `/play` bundle serving, `/docs`, `/healthz`, `/readyz`, `/metrics`, composition root |
| `apps/worker` | `@wasanni/worker` | Bun + BullMQ consumers | webhook delivery, mail, archive packing, score re-check, bundle extraction, partition ensure and archive, usage flush, sweeps |
| `apps/realtime` | `@wasanni/realtime` | Bun WebSockets, `REALTIME_PORT` (3001) | one room per game session, peer relay, score forwarding, cross-instance bridge |
| `apps/web` | `@wasanni/web` | TanStack Start, 5173 | `/landing` marketing, `/$orgSlug` dashboard (client-rendered) |
| `apps/mcp` | `@wasanni/mcp` | stdio MCP server | the api's routes as tools for an external agent, authenticated by one platform key |
| `packages/contracts` | `@wasanni/contracts` | — | entity vocabulary, wire schemas, error codes, realtime and webhook contracts. Depends on `elysia` only |
| `packages/kit` | `@wasanni/kit` | — | config, exceptions, email, events, logger, metrics, preflight, public ids, redis, scope, score rules, security, storage, tenancy |
| `packages/db` | `@wasanni/db` | — | Drizzle schema, migrations, the Postgres adapter and `scopeTo` |
| `packages/jobs` | `@wasanni/jobs` | — | queue names, job payloads, BullMQ queues, the enqueuer |

Dependency arrows:

```
apps/api ──> kit ──> contracts ──> elysia
   ├──> db ───┘
   ├──> jobs ─┘
   └──> contracts
apps/worker ──> jobs ──> kit ──> contracts
apps/realtime ──> kit ──> contracts; ──> db
apps/mcp ──> http ──> apps/api        # a client of the api, not a workspace dependant
```

`kit` imports nothing from Elysia: its env parser is hand-written so config does
not drag an HTTP framework into the shared layer. `jobs` sits between the apps so
the api and the worker agree on a job's shape without importing each other.

### Module layout

Every module in `kit` and `db` is a folder of `types.ts` (declarations only),
`constants.ts` (const tables, regexes, limits) and `<module>.ts` (functions and
classes). A file either declares data or runs behaviour, with one exception: a
schema and the type it derives are one unit, so they live together in `model.ts`.

`apps/api` is feature-first: `apps/api/src/modules/<feature>/` with
`index.ts` as the controller, `service.ts` for logic that touches no request,
`model.ts` for schemas, and `*.routes.ts` when one aggregate holds several
resources.

## 2. Invariants and their seams

| Invariant | The only seam |
|---|---|
| every tenant row is scoped | `organizationScope()` in `@wasanni/kit` → `scopeTo()` in `@wasanni/db` |
| every permission string | `ROLE_PERMISSIONS` / `PERMISSION` in `@wasanni/contracts` |
| every error response is one body | `failureOf()` in `apps/api/src/failures.ts` → `toErrorBody()` |
| every request carries one identity | `requestContextOf()` in `apps/api/src/plugins/request-context.ts` |
| every object in the bucket | `createObjectStorage()` in `@wasanni/kit` |
| every write leaves one audit row | `AuditService.record()` from three call sites |
| every outbound url is public unless told otherwise | `assertSafeOutboundUrl()` in `@wasanni/kit/security/outbound-url.ts` |

A second path for any of these is a review failure.

`Scope` carries `scoped: true` next to the organization id, so a `Principal` —
which also has an `organizationId` — does not typecheck where a tenant is
required. `organizationScope(principal)` is the only construction, and an empty
organization id throws rather than defaulting, because a query with no tenant is
a query over every tenant.

Three reads are deliberately **not** tenant reads, because they run before a
principal exists and take their tenant from the thing being verified:
`readMembership` (session + `:organizationId`), `readActiveApiKey` (key hash),
`readGameSessionByToken` (session token hash).

## 3. Data model

29 tables. Every one carries `organization_id` and is scoped, except the four
identity tables and the tables reached through a scoped parent. Ids are uuid v7
from `newId()` in `kit`, assigned by `advanced.database.generateId` for
Better Auth's models too.

### Identity — `packages/db/src/schema/identity/`

| Table | Notes |
|---|---|
| `user` | global, no `organization_id` |
| `session` | global; Better Auth's own session, distinct from a game session |
| `account` | one credential per provider per user |
| `verification` | email-ownership and pending proofs |

### Tenancy — `schema/organization/`

| Table | Key columns and constraints |
|---|---|
| `organization` | the tenant |
| `member` | `organization_id`, `user_id`, `role`, `displayName`, `avatar`; `role` may hold `admin,owner` |
| `invitation` | `organization_id`, `email`, `inviterId` — written as a `user.id`, not a `member.id` |
| `organization_role` | `organization_id`, `name`, the grant as `{resource: [actions]}`; a custom role of a compiled name replaces it in that tenant only |

### Platform access — `schema/platform/`, `schema/api-key/`

| Table | Key columns |
|---|---|
| `platform` | `organization_id`, `name`, `slug` unique per organization |
| `api_key` | `platform_id`, `organization_id` (so it answers to `scopeTo`), display prefix, `key_hash` (SHA-256), the grant, disabled and expiry columns; deleting the platform cascades |

### Games — `schema/game/`

| Table | Key columns |
|---|---|
| `game` | `organization_id`, `name`, `slug` unique per organization, `hosting`, `status` |
| `game_file` | `game_id`, `object_key`, declared `size_bytes` and `content_type`, `kind`, `status`, `is_current` — one current file per game, enforced by a partial unique index |
| `game_platform_assignment` | `game_id`, `platform_id`, unique per pair |
| `game_config` | `assignment_id`, `name` unique per assignment, `is_default` enforced by a partial unique index, `revision`, session duration, score rules, verification block |

### Templates — `schema/template/`

| Table | Key columns |
|---|---|
| `template` | `kind` (`game`/`tournament`), `slug` unique per organization and kind, live `object_key`/`size_bytes`/`content_type`, `pending_object_key`/`pending_size_bytes`/`pending_content_type`/`pending_expires_at`, `status` |

### Play — `schema/play/`

| Table | Key columns |
|---|---|
| `game_session` | `platform_id`, `game_id`, `assignment_id`, `tournament_id`, `match_id`, `external_user_id`, `status`, `config_snapshot`, `token_hash`, `expires_at` |
| `game_session_score` | `session_id` **unique**, `platform_id`, `game_id`, `external_user_id`, `score`, `status`, `flags`, `source`, `verification_status`, `hour_bucket`, `archive_key`/`archive_offset`/`archive_length`/`archive_rows` |

`game_session_score` is partitioned by hour when `SCORE_PARTITIONING_ENABLED` is
set: one table per hour under the parent, plus a default partition that holds a
score whose hour has no partition until the hour is ensured.
`SCORE_PARTITION_PREMAKE_HOURS` ahead-creates them.

### Competition — `schema/competition/`

| Table | Key columns |
|---|---|
| `tournament` | `organization_id`, `game_id`, `assignment_id`, `format`, `status`, `max_participants` |
| `tournament_participant` | unique `(tournament_id, platform_id, external_user_id)` |
| `match` | `tournament_id`, `bracket_round`, `bracket_slot`, `status`; unique `(tournament_id, bracket_round, bracket_slot)`; a standalone match is null in all three |
| `match_participant` | `match_id`, `slot` 0 or 1, session id, score, placement, outcome; unique `(match_id, slot)` |

### Webhooks — `schema/webhook/`

| Table | Key columns |
|---|---|
| `webhook_config` | `platform_id`, `organization_id`, `url`, subscribed events, enabled, the encrypted secret plus its last four characters, `last_delivery_at`, `last_failure_at` |
| `webhook_delivery` | one row per attempt: attempt number, status, response code, response body, duration |

### Usage — `schema/usage/`

| Table | Key columns |
|---|---|
| `usage_counter` | unique `(organization_id, platform_id, period_start, metric)`, plus a `(organization_id, metric, period_start)` lookup index |
| `usage_quota` | unique `(organization_id, metric, period)`, `limit_value` |

### Audit and agents

| Table | Key columns |
|---|---|
| `audit_log` | actor, action, resource, `resource_id`, organization, source; an auth row carries no organization |
| `agent_provider` | `organization_id`, `name` unique per organization, `spec`, `base_url`, `model`, `api_key_ciphertext`, `max_request_tokens`, `is_default` |
| `agent_project` | `organization_id`, name |
| `agent_session` | `organization_id`, `project_id`, title, pinned |
| `agent_run` | `organization_id`, `session_id`, `provider_id`, `created_by_member_id`, `created_by_user_id`, `model`, `prompt`, `output`, `status` in `succeeded`/`failed`/`refused`/`awaiting_approval`, `prompt_tokens`, `completion_tokens`, `cost_micros`, `duration_ms`, `error` |

Mastra keeps its own tables in a separate `mastra` Postgres schema via
`PostgresStore({ id: "wasanni-agent", schemaName: "mastra" })`.

## 4. Identity, principals and authorization

### Better Auth

One instance in `apps/api/src/config/better-auth.ts`, imported by no other
package, mounted at `/api/v1/auth` with `AUTH_ROUTE_PREFIX` in
`apps/api/src/constants.ts` as the single spelling of the prefix. It owns
password hashing, session tokens, cookie signing, OAuth state and callback, and
rate limits on the auth routes. This repo owns primary keys (`generateId` →
`newId()`), the wire shape of our own routes, and the plugins. It refuses to boot
under `NODE_ENV=production` with no `sendEmail` wired. `requireEmailVerification`
is off. Declared at `^1.6.22`, the floor set by CVE-2026-53516 and
CVE-2026-67327.

Organizations, members and invitations are served by Better Auth's organization
plugin under `/api/v1/auth/organization/*`; the plugin enforces the last-owner
rule on its own `remove-member`, `leave` and `delete`. `teams` is not passed, so
no team table exists. Its `dynamicAccessControl` is not used: the roles are ours.

### The four macros

| Macro | Credential | Yields | Failure |
|---|---|---|---|
| `auth` | session cookie | `user`, `session` | 401 |
| `organizationAuth` | `:organizationId` + session, one join against `member` | `Principal` with organization, member id, user id and the role-derived permission set | 401 or 403 |
| `platformAuth` | `X-API-Key` header, one read against `api_key` | `PlatformPrincipal` with platform id, key id, the key's organization and the key's grant | 401 or 403 |
| `sessionAuth` | session token, one read against `game_session.token_hash` | `GameSessionPrincipal` — no permissions at all | 401 or 403 |

`requirePermission(principal, PERMISSION.x)` takes a principal that may be null:
absent throws `unauthenticated`, present-without-the-permission throws
`forbidden`. Routes never spell a permission literal; a typo is a compile error.

### Permission vocabulary

`packages/contracts/src/constants.ts` holds `RESOURCES` (18: organization,
member, invitation, platform, apiKey, game, gameFile, assignment, gameConfig,
template, session, score, webhook, tournament, match, agent, audit, role),
`ACTIONS` (11: create, read, update, delete, cancel, publish, hide, complete,
register, seed, start), `PERMISSION` as `resource:action` constants,
`ROLE_NAMES` (`owner`, `admin`, `member`) and `ROLE_PERMISSIONS` as the role →
resource → actions table. `apps/api/src/access.ts` derives Better Auth's `ac` and
`roles` from the same table; `apps/api/src/permissions.ts` flattens a role into
the set a principal carries, so enforcement and the client cannot disagree.

Four conversion functions and no others: `flattenPermissions` (grant →
`resource:action` strings), `listUnknownPermissions` (what the vocabulary does
not contain), `rolesIn` (splits `admin,owner`, drops names the vocabulary does
not declare), `parsePermissionGrant` (reads the stored column; a value that is
not a grant yields no permissions rather than throwing, so a corrupt row fails
closed).

`owner` holds every action on every resource, including `audit:read` and
`role: FULL_ACTIONS`. `admin` holds `organization:read/update` but not delete, no
role permissions at all, and no delete on tournament, match or member; it holds
every other action an organization configures. `member` is read-only on
configuration, holds no `audit` and no `role`.

### Tokens

| Secret | Shape | Stored | Returned |
|---|---|---|---|
| API key | `wsk_` + 32 random bytes | SHA-256 hex in `api_key.key_hash`, plus a display prefix | once, at create |
| Session token | `newOpaqueToken(32)` | SHA-256 hex in `game_session.token_hash` | once, in the session-create response and inside `realtimeUrl` |
| Webhook secret | opaque | AES-256-GCM as `v1.iv.tag.ciphertext` under `WEBHOOK_SECRET_ENCRYPTION_KEY`, last four characters kept in clear | at create and at rotate |
| Callback secret | opaque | encrypted on the assignment, decrypted per session | never after creation |

`readActiveApiKey` does not return a disabled or expired key, which is what makes
revocation need no second check in the request path.

### Request context

`requestContextOf(request)` reads a `WeakMap` keyed by the incoming `Request` and
returns `{ requestId, startedAt }`. The plugin
`createRequestContextPlugin(logger)` uses `.derive({ as: "global" })` to expose
`requestId`, `startedAt` and a child `log`. Readers receive the context or a
thrown error, never a substitute, so a request id cannot change identity
mid-request. `.onError` is registered in `createApp` **before** the module routes
are used, because Elysia hands a route only the error handler in scope at
registration time.

## 5. Error model

`ERROR_CODES` in `packages/contracts/src/errors.ts`: `bad_request`,
`unauthenticated`, `forbidden`, `not_found`, `conflict`, `rate_limited`,
`unprocessable`, `internal`. It is the same union `HttpError` carries and the
same one `ErrorCodeModel` publishes.

Exception classes in `packages/kit/src/exceptions/`, one file each and flat:
`bad-request.ts`, `unauthorized.ts`, `forbidden.ts`, `not-found.ts`,
`conflict.ts`, `internal-server-error.ts`, all extending the abstract `HttpError`
in `base-error.ts`. Each carries its `code`; the status is `STATUS[code]`.

`failureOf` classifies: an `HttpError` subclass keeps its code and status; a
Better Auth `APIError` maps to one of our codes with its message kept (so an
invitation for an address already invited answers `409 conflict` rather than
`500`); anything else is `internal` plus one `unhandled error` log line.

`toErrorBody(errorSource, requestId)` produces the only response body shape for a
failure:

```json
{ "error": { "code": "conflict", "message": "…", "details": { }, "requestId": "…" } }
```

`ErrorBodyModel` in `packages/contracts/src/model.ts` declares it, and no caller
builds the object by hand.

## 6. HTTP surface

Every route is under `/api/v1`; the version is a path segment so a URL copied
out of `/docs` stays live. Unauthenticated ops paths are unversioned.

### Ops and docs

| Route | Notes |
|---|---|
| `GET /healthz`, `GET /readyz` | unauthenticated, on api, worker and gateway |
| `GET /metrics` | Prometheus text, `wasanni_http_requests_total`; blocked at ingress, not by a token |
| `GET /docs`, `GET /docs/json` | one merged OpenAPI document: ours plus Better Auth's |
| `GET /api/v1/auth/reference` | Better Auth's own page |
| `GET /api/v1/docs`, `GET /api/v1/docs/:slug`, `GET /llms.txt` | the integration guides, read by the agent's `api_docs` tool |
| `GET /play/:gameId/:fileId/*` | the bundle itself, served by the api |

### Tenant surface (`organizationAuth`)

| Resource | Routes |
|---|---|
| members | `GET/PATCH /organizations/:organizationId/members[/:memberId]`, `PUT /members/:memberId/role`, `GET/PATCH /members/me`, `POST/PUT /members/me/avatar` |
| roles | `GET/POST /organizations/:organizationId/roles`, `PATCH/DELETE /roles/:role` |
| platforms | `GET/POST /organizations/:organizationId/platforms`, `GET/PATCH/DELETE /platforms/:platformId`, `GET /platforms/:platformId/games` |
| keys | `GET /organizations/:organizationId/keys`, `GET/POST /platforms/:platformId/keys`, `PATCH/DELETE /keys/:keyId` |
| games | `GET/POST /games`, `GET/PATCH/DELETE /games/:gameId`, `POST /games/:gameId/publish`, `POST /games/:gameId/archive` |
| game files | `GET /games/:gameId/files`, `POST /files/upload`, `POST /files/:fileId/complete`, `GET /files/:fileId/download-url`, `DELETE /files/:fileId` |
| assignments | `GET /organizations/:organizationId/assignments`, `GET/POST /games/:gameId/assignments`, `DELETE /assignments/:assignmentId` |
| configs | `GET/POST /games/:gameId/assignments/:assignmentId/configs`, `PATCH/DELETE /configs/:configId` |
| templates | `GET/POST /templates`, `GET/PATCH/DELETE /templates/:templateId`, `POST /templates/:templateId/upload|complete`, `GET /templates/:templateId/download-url` |
| tournaments | `GET/POST /tournaments`, `GET/PATCH /tournaments/:tournamentId`, `POST …/open|seed|cancel|complete`, `GET/POST …/participants`, `DELETE …/participants/:participantId`, `GET …/standings`, `GET …/bracket` |
| matches | `GET/POST /matches`, `GET /matches/:matchId`, `POST /matches/:matchId/complete` |
| webhooks | `GET /organizations/:organizationId/webhooks`, `GET /webhooks/:webhookId/deliveries`, `GET/POST /platforms/:platformId/webhooks`, `GET/PATCH/DELETE /webhooks/:webhookId`, `POST …/test`, `POST …/rotate-secret` |
| usage | `GET /usage` (`?period=YYYY-MM`), `GET /usage/daily`, `GET /usage/storage`, `GET/PUT /quotas`, `DELETE /quotas/:metric` |
| audit | `GET /organizations/:organizationId/audit` |
| export | `POST /organizations/:organizationId/export` |
| agents | `GET /agents/specs`, `GET/POST /agents/providers`, `PATCH/DELETE /agents/providers/:providerId`, `GET/POST /agents/sessions`, `PATCH/DELETE /agents/sessions/:sessionId`, `GET /sessions/:sessionId/messages`, `GET /sessions/:sessionId/approvals`, `POST /sessions/:sessionId/approvals` (SSE), `GET/POST /agents/projects`, `PATCH/DELETE /projects/:projectId`, `POST /agents/models`, `GET /agents/runs`, `GET /agents/spend`, `POST /agents/run` (SSE) |
| organizations | `apps/api` owns only `POST /organizations/:organizationId/export`; the list of the caller's organizations comes from Better Auth's plugin under `/api/v1/auth/organization/*`, and the dashboard resolves its tenant from the slug in the URL |

### Machine surface (`platformAuth`, `x-api-key`)

| Route | Behaviour |
|---|---|
| `POST /api/v1/sessions` | open a session; quota-checked; returns the token and `realtimeUrl` |
| `GET /api/v1/sessions/:sessionId` | read a session |
| `POST /api/v1/sessions/:sessionId/end` | end a session, optionally emitting `session.ended` |
| `POST /api/v1/sessions/:sessionId/score` | the platform's own score, never verified |
| `POST /api/v1/players/:externalUserId/scores/hide` | hide a player's scores |
| `GET /api/v1/sessions/:sessionId/events` | the session's events |
| `GET /api/v1/games/:gameId/configs`, `/files`, `/files/:fileId/download-url`, `/leaderboards` | the platform's reads |
| `GET /api/v1/tournaments`, `/tournaments/:id`, `POST …/players/:externalUserId/join`, `DELETE …/leave`, `GET …/leaderboards`, `GET …/bracket` | a platform's tournament view |
| `GET /api/v1/matches/:matchId`, `POST /api/v1/matches/:matchId/players/:externalUserId/win` | a platform's match view |
| `GET /api/v1/platforms/:platformId/games`, `/usage` | the platform's own reads |

The tenant of a machine call comes from the key row, not the URL, which is why
these paths carry no `:organizationId`.

### Client surface (`sessionAuth`)

`POST /api/v1/play/sessions/:sessionId/score` — one score for one session, and
nothing else. A token for another session is refused.

## 7. Storage

`createObjectStorage()` in `@wasanni/kit` answers five questions: how to upload,
how to download, what the public address is, what is behind a key, how to delete.
Every feature that touches the bucket asks it, and `R2_*` being optional in
`Env` means a deployment with no bucket boots and answers
`400 object storage is not configured`.

Key grammar: `{location}/{organizationId}/{segments}/{uuid}-{filename}`, with
locations `game-bundles`, `template-bundles` and the member prefix
`members/{organizationId}/{memberId}/{uuid7}.{ext}`. The location is the
namespace, so two kinds of bundle cannot collide. A key cannot carry a path
traversal; `tests/kit/storage.test.ts` proves it.

**Presigned `PUT` signs `content-length` and `content-type`**, so a holder cannot
write a payload other than the one the api declared — R2 answers `403
SignatureDoesNotMatch`. A browser cannot set `content-length` itself, so the
check holds without the client cooperating. `completeUpload` is the trust
boundary: `HEAD` the object, compare size and content type against the row, and
on a mismatch delete the object and mark the row `failed` instead of `ready`.

Buckets must allow the web origin, `GET`/`PUT`/`HEAD`, header `content-type`,
expose `etag`.

**Bundle serving.** `GET /play/:gameId/:fileId/*` streams out of the bucket
through the api, because a bucket cannot send
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` — the pair that makes
`self.crossOriginIsolated` true and threaded Godot 4 / multithreaded Unity WebGL
run. The api sets content types (`.wasm` → `application/wasm`;
`.pck`, `.data`, `.mem`, `.unityweb` → `application/octet-stream`), forwards
`Range`, and serves the entry point for an extensionless miss when `spaFallback`
is set.

**Extraction.** A bundle zip goes to `{objectKey without .zip}/files` and the
worker unzips it while the row reads `extracting`. The entry point must be at the
zip root. Ceilings: `GAME_BUNDLE_MAX_UNCOMPRESSED_BYTES` (1 GiB default) and
`GAME_BUNDLE_MAX_FILES` (20,000 default).

## 8. Games, assignments and configs

`hosting` is `hosted` or `external`; only a hosted game accepts a bundle.
`status` is `draft` → `active` → `archived`, and publishing a hosted game
requires a `ready` current file. `game-state.ts` reads the game's own facts once
for the rules that cross resources, so no module reaches into another.

An assignment is one game on one platform of the same organization. Its config
holds `sessionDurationSeconds`, `rules.maxScore`, `rules.maxScorePerSecond` and
the `scoreVerification` block. Exactly one config per assignment is default
(partial unique index); exactly one file per game is current. Every config write
bumps `revision` and a writer that lost the race is refused. An assignment with
no config runs the empty config, which accepts every score without flags.

## 9. Play

**Session create.** Resolve the assignment, copy its default (or named) config
into `config_snapshot`, set `expires_at` from `sessionDurationSeconds`, generate
`newOpaqueToken(32)`, store its SHA-256, and return `{ sessionId, sessionToken,
realtimeUrl }` where `realtimeUrl` is
`${REALTIME_PUBLIC_URL}${REALTIME_PATH}/${id}?token=…`. `POST /api/v1/sessions`
is quota-checked, and the `sessionCreate` limiter counts
`SESSION_RATE_LIMIT_PER_MINUTE` (default 600) per minute against
`rl:sess:<apiKeyId>` — a platform principal, since only a key opens a session.

**Status.** `active` until ended, or `expired` when the sweep passes
`expires_at`. A score arriving after `expires_at` while the row is still
`active` is recorded with the `late` flag; after `expired` it is refused and a
`score.expired` event is dispatched.

**Score write.** One row per session (`session_id` unique). The first stands; a
later submission is recorded and flagged `resubmitted`. Flags are computed:
`client_source`, `late`, `resubmitted`, `max_score_exceeded`,
`score_rate_exceeded`. `source` is `server` for a key submission, `client` for a
token submission. Rate limit `SCORE_RATE_LIMIT_PER_MINUTE` (default 120).

**Verification.** `mode: "none"` records `verification_status =
"not_required"`. `mode: "callback"` posts `{ event: "score.verify", sessionId,
score }` signed `x-wasanni-verify-signature: t=<seconds>,v1=<hex>` over
`<timestamp>.<body>`, with the timestamp in `x-wasanni-verify-timestamp`, and
answers in `timeoutMs`:

| Callback outcome | Stored as | Effect |
|---|---|---|
| `{ "valid": true }` | `passed`, flag `callback_verified` | on the leaderboard |
| `{ "valid": false, reason }` | `failed`, flag `verification_failed` | flagged, off the leaderboard |
| no answer in time | `unavailable`, flag `verification_unavailable` | flagged, score kept |
| `source: server` | never checked | the platform's word |

**Leaderboard.** Best score per `external_user_id` for one game on one platform,
as a window function, paged with `limit`/`offset`, optionally bounded by period,
excluding flagged and hidden rows unless asked. `status` is `accepted` until the
player's scores are hidden, then `hidden`.

**Partitioning and archive.** `hour_bucket` is the partition key, taken from the
start of the session. Scores for an hour with no partition land in the default
partition until the ensure job creates it. `Partition Archive` exports one zstd
NDJSON object per organization batch and drops the table; a dry run exports and
keeps (`SCORE_ARCHIVE_ENABLED`, `SCORE_ARCHIVE_CRON`,
`SCORE_ARCHIVE_RETENTION_HOURS`, `SCORE_ARCHIVE_MAX_PARTITIONS_PER_RUN`,
`SCORE_ARCHIVE_DRY_RUN`). Session-event packing records `archive_key`,
`archive_offset`, `archive_length`, `archive_rows` on the score row and deletes
the Redis events only after the transaction that recorded the block commits.

**Recheck.** A config change queues a job whose id is bucketed by the minute, so
two edits in one minute recheck once. The processor recomputes the rule flags
against the new config and leaves the snapshot and the fact flags alone. No
`score.rechecked` event is emitted.

## 10. Competition

**Formats.** `leaderboard` — never seeded, standings read by joining
`game_session_score` to `game_session` on `tournament_id` and taking the best
score per registered player. `bracket` — seeded once.

**Statuses.** `draft` → `open` (registrations) → `running` (seeded) →
`completed` / `cancelled`.

**Registration.** Keyed on `(tournament_id, platform_id, external_user_id)`; a
duplicate returns the existing row, a returning withdrawer is revived.
`max_participants` counts registered rows only.

**Bracket arithmetic** (`apps/api/src/modules/competition/bracket.ts`, pure and
testable without a database): size is the next power of two ≥ `n`; rounds =
`log2(size)`; matches = `size - 1`, all created in one transaction at seed time;
seed order is standard; next match of `(round, slot)` is
`(round + 1, floor(slot / 2))`, side `slot % 2`; a first-round match holding one
seed is a bye, completed at seed time with the player seated into round two. No
column stores size, round count or an edge.

**Completion.** `update match set … where status in ('pending','active')
returning *` — a second completion updates nothing and returns the existing row.
The winner is seated `on conflict do nothing` on `(match_id, slot)` and only an
inserted seat activates the next match, so a repeated completion cannot seat a
side twice. Highest score wins; an exact tie is a draw with no winner. When every
match is completed the tournament completes and the final's winner becomes the
tournament winner.

**Score coupling.** The score service calls the match recorder after the score
row commits, behind a caught promise: a competition failure can never fail a
score submission.

## 11. Realtime

`apps/realtime` serves nothing over HTTP but `GET /rt/:sessionId` and the two
probes. Path and protocol live in
`packages/contracts/src/realtime.contract.ts` (`REALTIME_PATH` used by both the
gateway's route and the session response), because the client is not in this repo.

**Upgrade.** Token in the query or in `Authorization: Bearer`, hashed and looked
up in `game_session.token_hash` — the same credential `sessionAuth` reads.
`beforeHandle` throws before the socket exists: unknown token `401`; another
session's token, an ended session or an expired session `403`.

**Protocol.** Inbound: `message` only. Outbound: `ready` (carries room size),
`pong`, `score.recorded`, `peer.event`, `session.ended`, `error`.
`parseClientMessage` accepts a parsed object or a string, because Elysia hands
the handler the parsed JSON when the frame parses.

**Rooms.** One map in `rooms.ts`, one room per session id, a connection in
exactly one. Broadcast is a `send` to each member rather than Bun's topic
publish, because `ws.publish` skips the publishing socket. `closeRoom` and
`closeAll` have one implementation.

**Bridge.** One Redis channel `wasanni:realtime`, envelope
`{ origin, room, message }`. Each instance subscribes on its own `duplicate()`
connection, ignores its own `origin`, and delivers everything else locally. The
`origin` field is the loop guard.

**Scores.** A `score` message is forwarded to
`POST /api/v1/play/sessions/:sessionId/score` with the client's own token and the
api's answer becomes the socket reply; the gateway never writes a score. A 4xx is
`score_rejected` and is not retried; a 5xx or an unreachable api is
`score_failed` and the client may resend. `endSession` on an accepted score makes
the gateway send `session.ended`, which closes the room with `4000` after
delivery.

**Limits.** `WS_MAX_MESSAGE_BYTES` is Bun's `maxPayloadLength`, so an oversized
frame closes with `1009` before the handler runs.
`WS_IDLE_TIMEOUT_SECONDS` is Bun's `idleTimeout`; the protocol's `ping`/`pong`
lets a client judge its own half-open connection. `SIGTERM` closes every room
with `1001` before accepting stops.

## 12. Webhooks

`webhook_config` is the subscription; the api owns create, list, get, patch,
delete, rotate-secret and `webhook.test`; the worker owns the attempt. Events:
`score.submitted`, `score.expired`, `score.hidden`, `session.created`,
`session.ended`, `webhook.test`.

**Dispatch.** One job per subscribed webhook; nothing for an event nobody
subscribed to; nothing for a disabled subscription. Job id `whd-<webhook>-<event>`
throttles a race only while the job exists, so `x-wasanni-event-id` is the
receiver's deduplication key.

**Delivery headers.** `x-wasanni-event-id`, `x-wasanni-event-type`,
`x-wasanni-timestamp`, `x-wasanni-signature: t=<seconds>,v1=<hex>` — HMAC-SHA256
of `<timestamp>.<body>` under the decrypted secret. A non-2xx answer is an error:
the processor throws, the queue retries 5 times with 5 s exponential backoff and
20% jitter, and `last_failure_at` records it; `last_delivery_at` records the last
success.

**Delivery rows** are written after the attempt, and a failed write is a warning,
so a slow database cannot hold a delivery hostage. The api answers a webhook's
deliveries newest first, and the list of every webhook and every key in the
organization for the dashboard.

**Secret crypto** in `packages/kit/src/security`: AES-256-GCM, 12-byte iv,
stored as `v1.iv.tag.ciphertext`. `tests/kit/webhook-crypto.test.ts` proves the
round-trip, that another key cannot decrypt, that tampered ciphertext does not
authenticate, and that the signature covers timestamp and body.
`bun scripts/rotate-secret.ts <old-key> <new-key>` re-encrypts every secret in
place.

## 13. Queues and workers

`packages/jobs` owns the names, payloads, queues and the enqueuer. The api
queues; the worker consumes; neither imports the other. Every processor throws an
`Error` on failure and never returns one, so BullMQ's own semantics are the retry
policy. The queue connection is a dedicated `IORedis` with
`maxRetriesPerRequest: null`.

| Queue | Workers / processors | Retry |
|---|---|---|
| `webhooks` | `jobs/webhook.worker.ts` → `processors/webhook.processor.ts` | 5 attempts, 5 s exponential, 20% jitter |
| `email` | `jobs/email.worker.ts` → `processors/email.processor.ts` (ZeptoMail) | 4, 3 s, 20% jitter |
| `archive` | `processors/pack.processor.ts`, `recheck.processor.ts`, `archive-partitions.processor.ts`, `partition.processor.ts`, `game-bundle.processor.ts`, `usage-flush.processor.ts` | 3, 10 s, 20% jitter |
| `default` | `jobs/default.worker.ts` → `processors/sweep.processor.ts` | — |

Notable job shapes: the pack job is queued 60 s after a session ends or expires,
deduplicated per organization; the recheck job's id is bucketed by the minute;
a scheduled job reports itself when it fails rather than every time it runs.

## 14. Usage and quotas

Four counted metrics — `sessions_created`, `scores_submitted`,
`matches_created`, `tournaments_created` — as one upsert into `usage_counter`
after the event, per organization, platform and month. `bandwidth_bytes` is
counted in Redis at game-file request time and flushed by
`usage-flush.processor.ts` every minute; a minute that cannot be written is
dropped.

Quota checks happen where the event happens — session create and game file
request — as one query against quota plus counter, answering `429 rate_limited`
at the ceiling. `PUT /quotas` sets a ceiling, `DELETE /quotas/:metric` removes
one. `USAGE_METERING_ENABLED=false` stops counting and lets every check pass.

Storage is a gauge computed from ready-and-current game files and templates:
`GET /usage/storage` groups by game and by template. `GET /usage/daily` counts
one metric per day between two dates and fills empty days with zero.
`GET /usage` takes `?period=YYYY-MM`.

`POST /organizations/:organizationId/export` returns one JSON file of every row
the tenant owns — members, invitations, platforms, games, files, assignments,
configs, tournaments, participants, matches, sessions, scores — each with a
count, sessions and scores stopping at 10,000 rows each with the stop recorded in
`limits`. Bucket files are not included.

## 15. Audit

| Source | Seam | Covers |
|---|---|---|
| `auth` | `databaseHooks` in `apps/api/src/config/audit-hooks.ts` | user, session, account create / update / delete |
| `organization` | `organizationHooks` on the organization plugin | organization, member, invitation changes |
| `api` | `onAfterResponse` in `apps/api/src/plugins/audit.ts` | every mutating `/api/v1` request that answered below 400 |
| `worker` | background jobs | job outcomes |

The api row is derived from the URL: the resource is the segment after
`organizations/:organizationId`, singular and past-tensed (`game.created`), and
the id is the first uuid after it. A create has no id in its path, so
`resource_id` is null — parsing the created id out of the response body would
make the seam depend on every module's response model. `/api/auth` is skipped
(Better Auth's hooks already write those rows) and every derived `session` event
is skipped (the highest-volume write path, and none is a configuration change).
`record` never throws: a failed insert logs one `warn` and the request stands.

`GET /api/v1/organizations/:organizationId/audit` filters on actor, action,
resource, source and `from`/`to`, and pages by keyset on `(created_at, id)`
compared as `date_trunc('milliseconds', created_at)` — the cursor carries a
JavaScript date and the column holds microseconds, so without the truncation a
page boundary inside one millisecond would skip rows. `audit:read` belongs to
owner and admin; a member is 403. Auth rows carry no organization and so are not
reachable through the tenant read.

Actor types: `user`, `api_key`, `system` (the api itself, as during sign-up).

## 16. Agents

Runtime: `createAgentRuntime(databaseUrl, otelEndpoint?)` in
`apps/api/src/modules/agent/mastra.ts` builds a Mastra instance over
`PostgresStore` (`id: "wasanni-agent"`, `schemaName: "mastra"`), `Memory` with
`lastMessages: HISTORY_TURN_LIMIT` (20), and `Observability` exporting to
`MastraStorageExporter` plus an `OtelExporter` when `AGENT_OTEL_ENDPOINT` is set
(`protocol: "http/json"`, logs off, `maxBatchWaitMs: 1000`).

**Run.** `POST …/agents/run` answers `text/event-stream`. The setup is
`{ runtime, endpoint, instructions, tools, requestId }`; `runAgent` and
`resumeAgentRun` each take one object, and the request id travels as a
`RequestContext` pair so a run's log lines carry it. Limits:
`RUN_TIMEOUT_MS` 120 s, `MAX_AGENT_STEPS` 8, `MODELS_TIMEOUT_MS` 20 s,
`MAX_LISTED_MODELS` 500, `MAX_ERROR_LENGTH` 500, `RECENT_RUNS_LIMIT` 20,
`RECENT_SESSIONS_LIMIT` 50, `SPEND_WINDOW_DAYS` 30,
`DEFAULT_REQUEST_TOKEN_LIMIT` 32 000.

**Modes.** `agent` completes the request; `plan` plans and stops
(`MODE_INSTRUCTIONS`), and its text names the constraints an integrator must not
get wrong — a platform api key authenticates a server and never appears in
generated client html; the game client records scores through `POST
/api/v1/sessions` and the token that call returns. `DEFAULT_SYSTEM_PROMPT`
forbids inventing an endpoint and sends the model to `api_docs` instead, and
requires a generated game to work on a phone and a desktop, with a viewport meta
tag, viewport-sized layout, touch and keyboard input, 44 px tap targets, no
hover-only controls, no text under 14 px, no watermark, and one fenced
```` ```html ```` document.

**Tools.** Read-only and always available: `api_docs`, `integration_guide`,
`list_games`, `list_platforms`, `read_leaderboard`, `read_match`,
`read_tournament_standings` (`READ_ONLY_TOOL_NAMES`). Writing: `deploy_game`,
`create_tournament`, `open_tournament`, `register_player`, `seed_tournament`,
`cancel_tournament`, `start_duel`, `complete_match`, `record_score`. Every tool
call carries `actor: { type: "user", userId }`, `source: "agent"` and metadata
`{ agentRunId, via: "ai", tool }`, so an agent's write is audited as the user's
action through the same scoped services a human uses.

**Approval.** A tool call that requires approval makes the run park:
`agent_run.status = "awaiting_approval"`, the stream ends, and nothing past the
call executes. `GET …/sessions/:sessionId/approvals` lists what waits
(`pendingApprovals`), `POST` to the same path with a decision resumes the run
(`resumeAgentRun`) over a new SSE response. Approving a run that is not waiting
answers `400 this run is not waiting for approval`.

**Providers and models.** `agent_provider` holds base url, model, spec,
`api_key_ciphertext`, `maxRequestTokens`, `isDefault`, and a name unique per
organization. `POST …/agents/models` lists a provider's models through the api,
`GET …/agents/specs` serves the catalog (`models-api.json`, priced specs with
`priceInputMicrosPerMillion`, `priceOutputMicrosPerMillion`,
`priceCacheReadMicrosPerMillion`). `GET …/agents/spend` totals 30 days of cost
from recorded token counts.

**Outbound safety.** Any url the module is asked to reach — a provider base url,
a callback — goes through `assertSafeOutboundUrl` in `@wasanni/kit`: it parses the
url, resolves it, and throws `bad_request` when the address is private or
unresolvable, unless `ALLOW_PRIVATE_OUTBOUND_URLS` is set — it is `false` in
`.env.example` and true only in the test fixture's env. Its call sites are
`apps/api/src/modules/agent/transport.ts`, `run-agent.ts` and
`apps/api/src/modules/play/score-verifier.ts`, so a provider base url, the model
endpoint and a verification callback all pass the same guard.

## 17. MCP

`apps/mcp` is a stdio server (`bun run mcp`, or `@modelcontextprotocol/sdk`) that
exposes the api's routes as tools against one organization, authenticated by
`WASANNI_API_KEY` against `WASANNI_BASE_URL`. It holds `api.ts`, `api-docs.ts`,
`config.ts`, `server.ts`, `tools.ts` and `index.ts` and depends on nothing from
the workspace except HTTP: it is a client of the api, so it cannot bypass the
macros, the scopes or the audit seam.

## 18. Web

TanStack Start. Public routes `sign-in`, `sign-up`, `forgot-password`,
`reset-password`, `onboarding`, `accept-invitation.$id`, `docs/$slug`, and
`landing`. The tenant lives under `/$orgSlug` with a guard that reads the session,
resolves the organization from the slug, and hands it down; pages are overview,
games, platforms, keys, webhooks, assignments, templates, tournaments, matches,
usage, audit, agents and settings. `ssr: false` — the dashboard renders in the
browser. It calls the api through `VITE_API_URL` with the session cookie, and the
api trusts every web origin it is told about through `PUBLIC_WEB_ORIGIN`.

The shell is sidebar, topbar and breadcrumbs; the topbar opens a command palette
whose sections are `Go to`, `Create` and `Actions`, filtered on the label.
Keyboard: `⌘K` palette, `?` help, `g` + letter for a page, `n` for the create of
the current page. No shortcut fires while a field has focus or a dialog is open.

## 19. Configuration

Parsed by a hand-written parser in `packages/kit/src/config`. Required:
`DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `WEBHOOK_SECRET_ENCRYPTION_KEY`,
`BETTER_AUTH_URL`. Optional groups: `R2_*` / `STORAGE_*` (no bucket ⇒ boot
succeeds and the storage seam answers 400), `EMAIL_*` / `ZEPTOMAIL_API_KEY`
(production requires a transport at the auth module's own boundary),
`GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*`, `REALTIME_*` / `WS_*`,
`DB_POOL_MAX{,_WORKER,_REALTIME}`, `FD_LIMIT_MINIMUM`, partitioning and archive
flags, rate limits, `USAGE_METERING_ENABLED`, `SCORE_VERIFICATION_ENABLED`,
`AGENT_*` (base url, key, model, otel endpoint, `MASTRA_STUDIO_PORT`),
`ALLOW_PRIVATE_OUTBOUND_URLS`, `WASANNI_BASE_URL` / `WASANNI_API_KEY` for the MCP
server. `NODE_ENV` and `LOG_LEVEL` are always read. Every value in
`.env.example` is one of these names.

Secret-rotation consequences, as documented in `README.md`:
`WEBHOOK_SECRET_ENCRYPTION_KEY` is harmless after `scripts/rotate-secret.ts`;
`BETTER_AUTH_SECRET` invalidates every session; `REALTIME_JWT_SECRET` rejects
in-flight sockets on reconnect; `S3_SECRET_ACCESS_KEY` and `ZEPTOMAIL_API_KEY`
need only an overlap window.

## 20. Deployment constraints

| Constraint | Enforcement |
|---|---|
| Prepared statements off behind a pooler | `createDb` decides `prepare` from `isPooled(url)` — ports 6432/6543, `?pgbouncer=true`, `?prepare=false` |
| Pool sizes bounded per process | `DB_POOL_MAX`, `DB_POOL_MAX_WORKER`, `DB_POOL_MAX_REALTIME` |
| Redis must be `maxmemory-policy noeviction`, and file-descriptor limits adequate | `preflight()` in `@wasanni/kit`, called by all three apps; warns outside production, refuses to boot inside it |
| Migrations are reviewed SQL | `bun run db:generate` writes SQL from the Drizzle schema; a human reads it and commits it; CI applies it against a real Postgres |
| `nofile` limit | set in the systemd unit (the one that matters), `/etc/security/limits.conf`, the shell; `docker-compose.prod.yml` carries `ulimits.nofile` for every service |
| Prometheus scrape | `/metrics` needs no token; restrict it at the ingress |

## 21. Verification

| Command | Proves |
|---|---|
| `bun run typecheck` | `tsc --noEmit` across `apps/**`, `packages/**`, `tests/**` |
| `bun run typecheck:web` | the web app against its own tsconfig |
| `bun test` | every suite; `tests/db/*` skips unless `RUN_DB_TESTS=1` **and** `DATABASE_URL` are both set |
| `bun run ci` | typecheck, web typecheck, test |

Test suites: `tests/kit/*` (no I/O), `tests/contracts/*`, `tests/jobs/*` (the
enqueuer, no I/O), `tests/email/*`, `tests/realtime/*` (protocol, rooms, bridge,
gateway, score forwarder), `tests/api/*` (`createApp().handle(new Request(…))` —
whole app, no port, no database), `tests/db/*` (real Postgres).
`tests/db/fixture.ts` supplies a migrated database, an app built on it,
`signUpAndVerify` reading the verification link out of captured mail, and two
probe routes registered at construction — a route added after the first request
is not seen by that request's router, which is why `platformAuth` has coverage at
all.

`tests/` and `*.test*` are gitignored (`.gitignore` lines 37 and 39), so the
suite is not visible to CI as committed files, and `*.md` is ignored with only
`README.md` negated — which is why these documents are local artifacts.

A green `bun test` with no database is **not** a verified change.
