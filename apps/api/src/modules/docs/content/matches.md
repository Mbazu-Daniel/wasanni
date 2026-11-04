---
title: Matches
summary: Two-player duels and bracket rounds: create them, seat players, settle a winner.
order: 90
---

# Matches

A match is one round of play on one game between 2 and 64 seated players. It
either stands alone or belongs to a tournament bracket.

| status | means |
|--------|-------|
| `pending` | fewer than two seats filled |
| `active` | seated and waiting for a result; `startedAt` is set |
| `completed` | settled, `completedAt` and `winnerParticipantId` (or `null`) set |
| `cancelled` | its tournament was cancelled |

Each seat is a `matchParticipant` with a `slot` number, the player's
`platformId` and `externalUserId`, and after play a `score`, `sessionId`,
`placement`, and `outcome` of `pending`, `won`, `lost`, `draw`, or
`disqualified`.

## Routes

Matches are created and settled from the dashboard: or by an organization
key granted the matching `match` scopes on the management routes:

| method | path | permission |
|--------|------|-----------|
| `POST` | `/api/v1/organizations/:organizationId/matches` | `match:create` |
| `GET` | `/api/v1/organizations/:organizationId/matches` | `match:read` |
| `GET` | `/api/v1/organizations/:organizationId/matches/{matchId}` | `match:read` |
| `POST` | `/api/v1/organizations/:organizationId/matches/{matchId}/complete` | `match:complete` |

Over a platform api key, an integration reads a match and names its winner:

| method | path | permission |
|--------|------|-----------|
| `GET` | `/api/v1/matches/{matchId}` | `match:read` |
| `POST` | `/api/v1/matches/{matchId}/players/{externalUserId}/win` | `match:complete` |

## Create a duel

The dashboard's match form takes:

```json
{
  "gameId": "01J9…",
  "name": "Ada versus Bo",
  "participants": [
    { "platformId": "01J9…", "externalUserId": "player-8842", "displayName": "Ada" },
    { "platformId": "01J9…", "externalUserId": "player-1177", "displayName": "Bo" }
  ]
}
```

`participants` holds 2–64 entries and their order becomes `slot`, so slot 0 is
the first entry. `name` is up to 120 characters and only for display.

Because every seat you create is filled, the answer is `201` with a match whose
`status` is already `active` and `startedAt` set. `pending` appears only in
bracket matches, whose far side has not been played yet.

Refusals: `404 game not found`, `400 a participant appears twice in the same
match` when one `platformId` plus `externalUserId` shows up twice, and for a
match inside a tournament, `400 a tournament match has exactly two sides` and
`400 the match and the tournament must share a game`. Pass `tournamentId` to
tie the match to a tournament; leave it out for a standalone duel.

## Read

`GET /api/v1/matches/{matchId}`: or `GET
/api/v1/organizations/:organizationId/matches/{matchId}` from the dashboard:
answers `{ "match": …, "participants": […] }`: the whole state of one match,
including each seat's score.

`GET /api/v1/organizations/:organizationId/matches` lists the organization's
matches with `match` and `participants` per row, newest first, filtered by
`gameId`, `tournamentId`, and `status`. It is cursor-paginated:

```json
{
  "data": [ { "match": { … }, "participants": [ … ] } ],
  "page": { "limit": 50, "hasMore": true, "cursor": "…" }
}
```

`limit` is 1–200 and defaults to 50. Send `page.cursor` back as `cursor` for the
next page; `hasMore: false` and `cursor: null` end the list.

## Settle it

Name the winner by the seat id you read back, or by the player:

```json
{ "winnerParticipantId": "01J9…" }
{ "winnerExternal": { "platformId": "01J9…", "externalUserId": "player-8842" } }
```

```json
{ "match": { "id": "01J9…", "status": "completed", "winnerParticipantId": "01J9…", … } }
```

The winner's seat becomes `won` with `placement: 1` and every other seat still
`pending` becomes `lost`. An unknown seat is `404 winning participant not found`.
A match already `completed` answers `200` with its current state, so a retry is
safe; a cancelled one is `409 a cancelled match cannot be completed`.

Body with neither field closes the match with `winnerParticipantId: null` and
leaves every seat's outcome as it was: the way to abandon a match that will not
be played.

From a platform key the winner is the player in the path: `POST
/api/v1/matches/{matchId}/players/{externalUserId}/win`: with the body
`{ "platformId": … }`. That route cannot abandon a match; only the dashboard's
`POST /api/v1/organizations/:organizationId/matches/{matchId}/complete`
can.

## Winners decided by score

A session created with `matchId` binds that player's scores to their seat. Each
accepted score writes the seat's `score` and `sessionId`, and once every
undisqualified seat holds a score the match settles itself: highest score wins,
seats are placed in score order, and a shared top score closes the match with
`winnerParticipantId: null` and every seat marked `draw` and `placement: null`.

Two things follow from this. A match of two seats with only one score is left
open, so a player who never submits does not hand the win away by default. And
the score is stored first: if the seat update fails, the score still stands and
only the match is untouched, which `GET …/matches/{matchId}` will show.

See [Scores](/docs/scores) for what an accepted score costs you in flags, and
[Sessions](/docs/sessions) for creating a session against a match. The entry
checks live there: `400 the match belongs to another game`, `400 the match is
closed`, and `400 the player is not seated in this match`.

## In a bracket

Seeding creates the matches; completing one advances its winner to the seat
named by that match's `nextRound`, `nextSlot`, and `nextSide`. When the arrival
fills the second seat, that next match becomes `active` on its own. When the
final round's match is completed, the tournament becomes `completed` and the
winner's registration becomes `winner`.

So a bracket needs no closing call. Read the shape of it in
[Tournaments](/docs/tournaments), and poll `GET …/tournaments/{tournamentId}/bracket`
for the whole tree in one request: every match, its seats, and where each winner
goes.
