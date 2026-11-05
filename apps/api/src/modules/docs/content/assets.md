---
title: Platform reads
summary: The reads a key makes about its organization's games, and the usage counters those platforms produced.
order: 55
---

# Platform reads

The key acts as the organization; each call names the platform it means. A
`platformId` in the path is checked against your organization, and a platform
of another one is `404 not found`. A `?platformId=` filter narrows a read to
one platform, and naming a platform the game is not assigned to answers `403
this game is not assigned to the platform`. Without a filter a read spans your
organization's assignments.

| method | path | permission |
|--------|------|-----------|
| `GET` | `/api/v1/platforms/{platformId}/games` | `assignment:read` |
| `GET` | `/api/v1/games/{gameId}/configs` | `gameConfig:read` |
| `GET` | `/api/v1/games/{gameId}/files` | `gameFile:read` |
| `GET` | `/api/v1/games/{gameId}/files/{fileId}/download-url` | `gameFile:read` |
| `GET` | `/api/v1/platforms/{platformId}/usage` | `audit:read` |

## The games of a platform

`GET /api/v1/platforms/{platformId}/games` answers `{ "assignments": […] }`,
newest first, each row `{ id, organizationId, gameId, platformId, status,
createdAt, updatedAt }`. `status` is `active` or `disabled`; a disabled
assignment still lists here, and opening a session on its game answers `400 the
game is not assigned to this platform`: see `sessions`.

An organization admin assigns games from the dashboard; these reads never
assign anything.

## The config a game runs with

`GET /api/v1/games/{gameId}/configs` answers the configs of every assignment of
that game inside your organization; `?platformId=` narrows them to that
platform's assignment:

```json
{
  "configs": [
    {
      "id": "01J9…",
      "assignmentId": "01J9…",
      "name": "Ranked",
      "config": { "rules": { "maxScore": 1000 } },
      "isDefault": true,
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

A session opened without `configId` resolves the assignment's default config, so
`isDefault: true` names the rules your game plays under. The callback secret of a
`scoreVerification: { "mode": "callback" }` config is never in `config`: it is
written once and only replaced, never read back.

## The files and their urls

`GET /api/v1/games/{gameId}/files` answers `{ "files": […] }`: every version of
that game, each with `status` (`pending_upload`, `extracting`, `ready`,
`failed`), `kind` (`single` or `bundle`), `version`, `platformSlug`,
`sizeBytes`, `entryPoint`, and `isCurrent`. One version per platform carries
`isCurrent: true` once a file is `ready`.

`GET /api/v1/games/{gameId}/files/{fileId}/download-url` answers
`{ "url": "…" }`: a signed get url for that one version's bytes. It is the way
to cache a game outside Wasanni; a game played inside a browser is served by the
`/s/{platformSlug}/{gameSlug}/` url, which always plays the current build of
that platform with no cache lifetime, or by a timestamped
`/s/{platformSlug}/{gameSlug}/{timestamp}.html` url, and needs no key.

## Join codes

Every session, tournament enter, and duel enter answers `joinCode`, a
10-character alphanumeric code, and `playUrl`. The play url is the game's
public build with the tournament context on it:
`{gameUrl}?tournamentId={id}&externalUserId={player}&code={joinCode}`. Give
the player that url, or just the code: the game resolves it with
`GET /api/v1/join/{code}` — no key, rate-limited per caller — and gets back
the `playUrl` to load, the `realtimeUrl` socket to play on, and the platform,
game, tournament game seed, tournament, match, and player it resolved to. The
code is the session
credential: the client opens the socket with `?token=<code>` and sends
`{"type":"score","score":n}` over it, or posts with
`Authorization: Bearer <code>`, and every score lands in that session in that
tournament. The game itself stays simple: it reads the code from the url,
joins, and plays. A code stops working when its session ends or expires, and
wrong guesses answer 404.

The platform server mints the url with its own key: enter the tournament or
open a session with `tournamentId` and the player's `externalUserId`, and hand
the player the resulting `playUrl`. The key never reaches the browser.

## What a platform used

`GET /api/v1/platforms/{platformId}/usage?period=2026-11` answers the four
counters that platform produced in that calendar month, defaulting to the
current one:

```json
{
  "period": { "start": "2026-11-01T00:00:00.000Z", "end": "2026-12-01T00:00:00.000Z" },
  "counters": {
    "sessions_created": 1280,
    "scores_submitted": 1102,
    "matches_created": 64,
    "tournaments_created": 3
  }
}
```

A `period` that is not `YYYY-MM` is refused by the request schema. Quotas are
the organization's decision: `429 rate_limited` arrives with
`the monthly quota for sessions_created is reached (1280/1280)` once the month
passes the ceiling set on the dashboard.
