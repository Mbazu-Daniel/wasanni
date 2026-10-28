# Wasanni

Sessions, scores, tournaments, and replays for games.

Architecture and invariants: [`ARCHITECTURE.md`](ARCHITECTURE.md). Domain
vocabulary: [`GLOSSARY.md`](GLOSSARY.md). Binding rules for agents:
[`AGENTS.md`](AGENTS.md).

## Requirements

- Bun ≥ 1.1
- Docker (for Postgres, PgBouncer and Redis)

## First run

```bash
bun install
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

`docker-compose.yml` runs Postgres on 5432, PgBouncer in transaction mode on
6432 and Redis on 6379. `DATABASE_URL` decides which one the api talks to, and
`createDb` turns prepared statements off when it points at the pooler. Deploying,
file descriptor limits and why Redis must keep `noeviction`:
[`deploy/README.md`](deploy/README.md).

Then:

```bash
curl localhost:3000/healthz
curl localhost:3000/readyz
curl localhost:3000/api/v1/auth/get-session
open http://localhost:3000/docs
open http://localhost:3000/api/v1/auth/reference
curl localhost:3000/docs/json | jq '.paths | keys'
```

`/docs` is the single document for everything the API serves — our own routes and
better-auth's together, so an endpoint copied out of it is a live URL.

```bash
curl localhost:3001/healthz
curl localhost:3001/readyz
```

`apps/realtime` listens on `REALTIME_PORT` (3001) and upgrades
`/rt/:sessionId?token=…`. A session's create response carries that URL as
`realtimeUrl`, token included.

```js
const socket = new WebSocket(realtimeUrl);
socket.onmessage = (event) => console.log(JSON.parse(event.data));
socket.send(JSON.stringify({ type: "score", score: 1200, endSession: true }));
```

A sign-up, at `debug` level, prints the link it would have emailed:

```bash
curl -X POST localhost:3000/api/v1/auth/sign-up/email \
  -H 'content-type: application/json' \
  -H 'origin: http://localhost:3000' \
  -d '{"email":"ada@example.com","password":"correct horse battery staple","name":"Ada"}'
```

`bun run db:generate` creates a migration from the Drizzle schema. Read the
generated SQL by hand and commit it.

## Layout

| Path | What lives there |
|---|---|
| `apps/api` | Elysia HTTP server, `/api/v1` routes, OpenAPI document, composition root |
| `apps/worker` | Background jobs: webhook delivery, mail, session archiving, sweeps |
| `apps/realtime` | WebSocket gateway: one room per game session, peer relay, score forwarding |
| `packages/contracts` | Entity vocabulary and wire schemas. Depends on `elysia` only. |
| `packages/kit` | Config, errors, email, HTTP protocol shapes, logging, ids, security, tenancy, the organization scope, the object storage |
| `packages/db` | Drizzle schema, migrations, the Postgres adapter |
| `packages/jobs` | The queue names, the job payloads, the BullMQ queues and the enqueuer |

Every module in `packages/` and `apps/` is a folder holding:

| File | Holds |
|---|---|
| `types.ts` | Types, interfaces, enums — declarations only |
| `constants.ts` | Const tables, regexes, limits — declarations only |
| `model.ts` | Elysia schemas, grouped, with types derived from them |
| `<module>.ts` | Functions, classes, route handlers |

A file either declares data or runs behaviour. Never both. Exception: a schema
and the type it derives are one declaration, so `model.ts` holds both. See
[`CODING_STANDARDS.md`](CODING_STANDARDS.md).

### Features

`apps/api` is organised by feature. A feature is a folder:

```
apps/api/src/modules/auth/
  index.ts       controller — mounts the handler, resolves the session
  model.ts       schemas, grouped, types derived from them
  openapi.ts     the Better Auth half of the OpenAPI document

apps/api/src/modules/member/
  index.ts       the signed-in member's own record under /members/me
  service.ts     the read, and the one write better-auth leaves us: displayName

apps/api/src/modules/platform/
  index.ts       controller — platforms under /organizations/:organizationId
  service.ts     platform reads and writes

apps/api/src/modules/api-key/
  index.ts       controller — api keys under /organizations/:organizationId/platforms
  service.ts     api key reads and writes

apps/api/src/modules/games/
  index.ts       controller — the games aggregate under /organizations/:organizationId
  game.routes.ts / game.service.ts
  game-file.routes.ts / game-file.service.ts
  assignment.routes.ts / assignment.service.ts
  game-config.routes.ts / game-config.service.ts

apps/api/src/modules/templates/
  index.ts       controller — templates under /organizations/:organizationId
  template.routes.ts / template.service.ts
  template-bundle.service.ts

apps/api/src/modules/play/
  index.ts       controller — game sessions, scores and leaderboards
  session.routes.ts / session.service.ts
  score.routes.ts / score.service.ts
  leaderboard.routes.ts / leaderboard.service.ts
  replay.routes.ts / replay.service.ts

apps/api/src/modules/webhook/
  index.ts       controller — webhook subscriptions under a platform
  webhook.routes.ts / webhook.service.ts
  webhook-dispatcher.ts
```

`apps/api/src/config/better-auth.ts` holds the Better Auth instance and every
plugin, outside the feature folders because three places read it.

One Elysia instance is one controller. `Context` is never passed to a function.
Schemas come from `t` in `elysia`. `auth`, `member`, `platform`, `apiKey`,
`games`, `templates`, `play` and `webhook` are the features. Full conventions:
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Organizations, members and invitations are served by the Better Auth
organization plugin directly — `/api/v1/auth/*` carries `/organization/*`, so
the frontend reaches them through the Better Auth client. No wrapper routes or
service layer exist for them.

The auth module mounts Better Auth at `/api/v1/auth` for sign-up, sign-in, password
reset and the Google and GitHub callbacks, and answers
`GET /api/v1/auth/me` from the session it resolves. With `LOG_LEVEL=debug` and
no transport configured, the mail it would send is written to the API log as
`mail.dev`, so a local sign-up can be verified from there. The module refuses to
boot under `NODE_ENV=production` without a transport, because a verification mail
that goes nowhere locks the account out.

Client routes live under `/api/v1`, and the version is a path segment rather than
a header or a query parameter so a URL copied out of `/docs` stays live. The
marketing site is a separate origin and is not versioned by this API at all.

| Path | Serves |
|---|---|
| `/api/v1/...` | client routes, one segment per resource |
| `/api/v1/auth/...` | Better Auth and `GET /me` |
| `/api/v1/organizations` | the caller's organizations |
| `/api/v1/organizations/:organizationId/...` | every tenant-scoped resource |
| `/api/v1/platform/...` | the routes an api key calls |
| `/api/v1/play/...` | the routes a session token calls |
| `/play/:gameId/:fileId/*` | the game bundle itself, served by the api |
| `/docs` | one OpenAPI document describing all of the above |
| `/api/v1/auth/reference` | Better Auth's own page for its endpoints |
| `/healthz`, `/readyz` | the ops probes |
| `/metrics` | Prometheus text, `wasanni_http_requests_total` |

`/metrics` answers without a token on purpose — a scraper has no session. Block
it at the ingress instead: only the monitoring network may reach it.

`/docs` carries better-auth's endpoints — 22 of the organization plugin's among
them — not just ours: the auth module contributes them through `openAPI()`'s
`generateOpenAPISchema`, each key prefixed with `/api/v1/auth`, so
`curl localhost:9000/docs/json` lists every sign-up,
sign-in, email-verification and OAuth route with its operation id, request body
and security scheme. The startup log prints both URLs.

## Game bundles

A hosted game is one zip in R2. Upload it with `kind: "bundle"`:

```bash
curl -s localhost:3000/api/v1/organizations/$ORG/games/$GAME/files/upload \
  -H 'content-type: application/json' -b cookies.txt \
  -d '{"filename":"neon-racer.zip","version":"1.4.0","contentType":"application/zip",
       "sizeBytes":<bytes>,"kind":"bundle","entryPoint":"index.html",
       "crossOriginIsolation":true}'
```

`PUT` the zip to the returned url, then `POST .../complete`. The file goes to
`extracting` while the worker unzips it; poll `GET .../files` until `ready`.
The zip must hold `index.html` at its root — zip the contents of the export
folder, not the folder. Unity, Godot, Construct and PlayCanvas exports all
qualify.

The game is then served from `/play/:gameId/:fileId/`:

- `crossOriginIsolation: true` sends `Cross-Origin-Opener-Policy: same-origin`
  and `Cross-Origin-Embedder-Policy: require-corp`, which is what
  `self.crossOriginIsolated` and `SharedArrayBuffer` need. Threaded Godot 4 and
  multithreaded Unity WebGL require it.
- `.wasm` is served as `application/wasm`; `.pck`, `.data`, `.mem` and
  `.unityweb` as `application/octet-stream`.
- `Range` requests are forwarded to R2, so `.wasm` and `.pck` load in pieces.
- `spaFallback: true` serves `index.html` for an extensionless miss only.

A `.zip` without `kind: "bundle"` is read as a bundle anyway; a bundle that is
not a `.zip` filename, or a `.zip` declared `kind: "single"`, is refused.

## Usage and quotas

Every session, score, match and tournament is counted for the organization it
belongs to, per platform, per month:

```bash
curl -s localhost:3000/api/v1/organizations/$ORG/usage -b cookies.txt
curl -s localhost:3000/api/v1/platform/usage -H "x-api-key: $KEY"
```

A quota is a monthly ceiling on one metric. Set one, and the api refuses the
event with a 429 once the month reaches it:

```bash
curl -s -XPUT localhost:3000/api/v1/organizations/$ORG/quotas \
  -H 'content-type: application/json' -b cookies.txt \
  -d '{"metric":"sessions_created","limitValue":10000}'
```

Bandwidth is counted in Redis and flushed to the database every minute, so a
quota on `bandwidth_bytes` stops the game files a minute after the limit is
reached. Storage is not a counter: it is computed from the game files and
templates that are ready, because a counter would drift.

`USAGE_METERING_ENABLED=false` turns the counting off and lets every quota
check pass.

## Server-side score verification

A game can ask the api to check a score before it accepts it. The config of a
game assignment carries the block:

```json
{ "scoreVerification": { "mode": "hmac" } }
```

`hmac` signs the score with a key the session hands out when it opens, so the
game server proves the score is its own:

```bash
curl -s -XPOST localhost:3000/api/v1/platform/sessions \
  -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"gameId":"'$GAME'","externalUserId":"player-1"}'
```

The answer carries `scoreSigningKey` once. The client signs
`"{sessionId}|{score}"` with it and sends the signature with the score. A
signature that does not match is refused with a 422 and no score is written,
and the platform is told through a `score.rejected` webhook.

`callback` asks a url of the platform whether a score is valid; `both` does
both. A verifier that does not answer leaves the score in place, flagged
`verification_unavailable` — a game server outage is not a reason to drop
scores. The default is `none`: every score is accepted, as before.

## Custom roles

An organization can name its own roles. A role is a grant — the same shape an
api key carries — and a member holding it gets exactly that grant:

```bash
curl -s localhost:3000/api/v1/organizations/$ORG/roles \
  -H 'content-type: application/json' -b cookies.txt \
  -d '{"role":"judge","permission":{"score":["read","hide"],"tournament":["read"]}}'
```

`owner` creates, changes and deletes roles; `POST` is a conflict when the name
is taken, `PATCH /roles/:role` changes the grant, `DELETE /roles/:role` takes
it away. A role named `owner` cannot be redefined, and the owner role always
keeps its compiled permissions, so an organization cannot lock itself out.

A member is given a role with
`PUT /api/v1/organizations/$ORG/members/$MEMBER/role` and the body
`{"role":"judge"}`. A role that the organization has not created is refused.

A custom role replaces the compiled role of the same name inside that
organization, and only there: the built-in `owner`, `admin` and `member` roles
stay as they are until an organization overrides one.

## Secret rotation

`bun scripts/rotate-secret.ts <old-key> <new-key>` re-encrypts every webhook
secret in place. Deploy the new key afterwards, then remove the old one.

| Secret | Rotation effect |
|---|---|
| `WEBHOOK_SECRET_ENCRYPTION_KEY` | None, if the secrets are re-encrypted first |
| `BETTER_AUTH_SECRET` | Every session is invalidated — users sign in again |
| `REALTIME_JWT_SECRET` | In-flight sockets are rejected on reconnect |
| `S3_SECRET_ACCESS_KEY` | None, if the old key is valid during the overlap |
| `ZEPTOMAIL_API_KEY` | None |

## Conventions
- Every module is `domain / app / adapters`. Arrows point inward. The domain
  never imports Elysia or Drizzle.
- Every tenant query passes through `organizationScope(...)`, in `@wasanni/kit`.
  An empty organization ID throws. `scopeTo(...)` in `@wasanni/db` is the adapter
  that applies it.
- Public IDs are uuid v7. Internal keys never leave the database.
- Error responses are serialized by `toErrorBody(...)`. Never built by hand.
- Runtime schemas come from `t` in `elysia`. `@sinclair/typebox` is not a
  dependency of this repo; a schema `t` lacks is written by hand.
- Secrets are hashed. Plaintext is never stored and never logged.
- Schema changes are generated SQL files, reviewed by hand, and applied against
  a real Postgres in CI.

## Scripts

| Script | Does |
|---|---|
| `bun run dev` | API + worker, both watching |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun test` | Unit + integration tests |
| `bun run db:generate` | Generate a migration from the Drizzle schema |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:studio` | Drizzle Studio |
| `bun run ci` | `typecheck` then `test` |

`tests/db/*` runs against a real Postgres and **skips** when `DATABASE_URL` is
unset. A green `bun test` with no database is not a verified change.
