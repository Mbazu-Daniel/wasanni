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
open http://localhost:3000/docs
```

`bun run db:generate` creates a migration from the Drizzle schema. Read the
generated SQL by hand and commit it.

## Layout

| Path | What lives there |
|---|---|
| `apps/api` | Elysia HTTP server, `/v1` routes, OpenAPI document, composition root |
| `apps/worker` | Background jobs |
| `packages/contracts` | Entity vocabulary and wire schemas. Depends on `elysia` only. |
| `packages/kit` | Config, errors, HTTP protocol shapes, logging, ids, security, tenancy, the workspace scope |
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
apps/api/src/modules/<feature>/
  index.ts     controller — routing, validation, responses
  service.ts   business logic — no Elysia, no Context
  model.ts     schemas, grouped, types derived from them
```

One Elysia instance is one controller. `Context` is never passed to a function.
Schemas come from `t` in `elysia`. There are no features yet — this is the shape
the first one gets. Full conventions: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Conventions

- Every module is `domain / app / adapters`. Arrows point inward. The domain
  never imports Elysia or Drizzle.
- Every tenant query passes through `workspaceScope(...)`, in `@wasanni/kit`.
  An empty workspace ID throws. `scopeTo(...)` in `@wasanni/db` is the adapter
  that applies it.
- Public IDs are `prefix_` + 16 Crockford base32 characters. Internal keys
  never leave the database. The prefixes live in `@wasanni/contracts`, not in
  the ID generator.
- Error responses are serialized by `toEnvelope(...)`. Never built by hand.
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
