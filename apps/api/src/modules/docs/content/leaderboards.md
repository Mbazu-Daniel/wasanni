---
title: Leaderboards
summary: Best score per player on your organization's platforms, ranked and paginated.
order: 50
---

# Leaderboards

`GET /api/v1/games/{gameId}/leaderboards` with `x-api-key` for a platform key
carrying `score:read`.

| query | default | note |
|-------|---------|------|
| `platformId` | unset | narrows the board to one platform of your organization |
| `mode` | unset | matches the `mode` the sessions were opened with, up to 80 characters |
| `limit` | 50 | 1–200 |
| `cursor` | unset | the `page.cursor` from the previous response |
| `includeFlagged` | false | when false, flagged scores never appear |

Without `platformId` the board spans every platform of your organization, so a
player who plays on two platforms appears once per platform: the same
`externalUserId` means different people on different platforms. Each entry
carries `platformId`, which is how you tell them apart. The game sits in the
path, so one board is addressed by the ids that define it.

```json
{
  "entries": [
    { "rank": 1, "sessionId": "01J9…", "platformId": "01J9…", "externalUserId": "player-1", "score": 420, "flagged": false, "submittedAt": "…" }
  ],
  "page": { "limit": 50, "hasMore": true, "cursor": "NDIwfDIwMjYtMTEtMDJUMTA6…" }
}
```

## How the ranking is built

Only `accepted` score rows count. For each `externalUserId` the best score wins,
ties broken by the earlier `submittedAt` and then by row id, so the ranking is
stable across two identical requests. The final order is score descending, then
submitted earliest first, then id: the same rule decides both the per-player
best and the board order.

`rank` is that board order's 1-based position over the whole board, numbered
before paging, so page two continues the numbering instead of restarting at 1.
Paging is keyset, not offset: pass the `page.cursor` of the previous response as
`cursor` and the next rows are the ones ranking below the score, `submittedAt`
and row id encoded in it.

Because the board is a best-per-player view of stored scores, a session that
submitted twice in its hour contributes the first number only: see `scores`.

## Reading it next to a tournament

A leaderboard-format tournament ranks its registered players over the sessions
that carried its `tournamentId`, through
`GET /api/v1/tournaments/{tournamentId}/leaderboards`. That view keeps
players with no score at all (their `score` is `null`), which the game
leaderboard never shows, and a bracket tournament answers `409 only a leaderboard
tournament has a leaderboard` instead.

## Cost

600 requests a minute per api key, in a fixed window. Over the limit the answer
is `429 rate_limited` with `details.retryAfter` in seconds. Poll it on a timer or
on demand; do not fetch a board per player per frame.

## Removing a player from the board

Hiding is the only way to demote a score without deleting the row:
`POST /api/v1/players/{externalUserId}/scores/hide` (see `scores`).
A hidden score leaves the leaderboard immediately and the `rank` values shift
with it.
