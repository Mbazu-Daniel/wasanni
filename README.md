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
| `/docs` | one OpenAPI document describing all of the above |
| `/api/v1/auth/reference` | Better Auth's own page for its endpoints |
| `/healthz`, `/readyz` | the ops probes |

`/docs` carries better-auth's endpoints — 22 of the organization plugin's among
them — not just ours: the auth module contributes them through `openAPI()`'s
`generateOpenAPISchema`, each key prefixed with `/api/v1/auth`, so
`curl localhost:9000/docs/json` lists every sign-up,
sign-in, email-verification and OAuth route with its operation id, request body
and security scheme. The startup log prints both URLs.

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
