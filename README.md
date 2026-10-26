# Wasanni

Sessions, scores, tournaments, and replays for games.

Architecture and invariants: [`ARCHITECTURE.md`](ARCHITECTURE.md). Domain
vocabulary: [`GLOSSARY.md`](GLOSSARY.md). Binding rules for agents:
[`AGENTS.md`](AGENTS.md).

## Requirements

- Bun ≥ 1.1
- Docker (for Postgres and Redis)

## First run

```bash
bun install
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

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
| `apps/worker` | Background jobs |
| `packages/contracts` | Entity vocabulary and wire schemas. Depends on `elysia` only. |
| `packages/kit` | Config, errors, email, HTTP protocol shapes, logging, ids, security, tenancy, the workspace scope |
| `packages/db` | Drizzle schema, migrations, the Postgres adapter |

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
  index.ts       controller — routing, validation, responses, the auth macro
  auth.ts        the Better Auth instance, built from the feature's deps
  model.ts       schemas, grouped, types derived from them
  constants.ts   the route prefix
```

One Elysia instance is one controller. `Context` is never passed to a function.
Schemas come from `t` in `elysia`. `auth` is the first feature and is the shape
the rest get. Full conventions: [`ARCHITECTURE.md`](ARCHITECTURE.md).

`auth` mounts Better Auth at `/api/v1/auth` for sign-up, sign-in, magic link,
password reset and the Google and GitHub callbacks, and answers
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
| `/docs` | one OpenAPI document describing all of the above |
| `/api/v1/auth/reference` | Better Auth's own page for its 32 endpoints |
| `/healthz`, `/readyz` | the ops probes |

`/docs` carries better-auth's endpoints, not just ours: the auth module
contributes them through `openapi()`'s `generateOpenAPISchema`, each key prefixed
with `/api/v1/auth`, so `curl localhost:9000/docs/json` lists every sign-up,
sign-in, magic-link and OAuth route with its operation id, request body and
security scheme. The startup log prints both URLs.

## Conventions

- Every module is `domain / app / adapters`. Arrows point inward. The domain
  never imports Elysia or Drizzle.
- Every tenant query passes through `workspaceScope(...)`, in `@wasanni/kit`.
  An empty workspace ID throws. `scopeTo(...)` in `@wasanni/db` is the adapter
  that applies it.
- Public IDs are `prefix_` + 16 Crockford base32 characters. Internal keys
  never leave the database. The prefixes live in `@wasanni/contracts`, not in
  the ID generator.
- Error responses are serialized by `toErrorBody(...)`. Never built by hand.
- Runtime schemas come from `t` in `elysia`. `@sinclair/typebox` is a supported
  peer dependency of Elysia, so import it directly only when `t` lacks what you
  need — never as a rival schema dialect.
  A prefix is a noun; if it needs a verb to explain it, it is two entities.
- Secrets are hashed or HMAC'd. Plaintext is never stored and never logged.
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
