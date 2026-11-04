---
title: Game sessions
summary: Open, read and end a session; what its token, expiry and config snapshot mean.
order: 30
---

# Game sessions

A session is one player playing one game on one platform. It is the unit a
score is attached to, the unit a leaderboard row names, and the unit the realtime
room is keyed by.

## Open one

`POST /api/v1/sessions` with `x-api-key` for a platform key carrying
`session:create`. An organization key is refused at creation, so it can never
reach this route.

```json
{
  "gameId": "01J9…",
  "platformId": "01J9…",
  "externalUserId": "player-1",
  "externalName": "Ada",
  "mode": "ranked",
  "configId": "01J9…",
  "tournamentId": "01J9…",
  "matchId": "01J9…",
  "metadata": { "region": "eu-west" }
}
```

`gameId`, `platformId` and `externalUserId` are required; `externalUserId` is
1–200 characters and `externalName` and `mode` are capped at 200 and 80.
`platformId` names the platform the player plays on, one of your
organization's. `externalUserId` is your own id for the player: the API never
invents one and never sees yours except here.

The call answers `201`:

```json
{
  "session": { "id": "01J9…", "status": "active", "startedAt": "…", "expiresAt": "…", "config": { … } },
  "sessionToken": "…",
  "realtimeUrl": "wss://rt.wasanni.test/rt/01J9…?token=…"
}
```

`sessionToken` is returned only by this call. Hand it to the game client, which
uses it as a bearer token for its own score (see `scores`). Your backend keeps
using the api key and never needs the token.

## What must already be true

| condition | refusal |
|-----------|---------|
| the game is assigned to the named platform and that assignment is active | `404 not_found` / `400 bad_request` |
| the game is published (`active`) | `400 bad_request`: "the game is not published" |
| a `hosted` game has a `ready` game file | `400 bad_request` |
| `configId` names a config of this game and platform | `404 not_found` |
| `tournamentId` is `open` or `running` and the player is registered and not withdrawn | `403 forbidden` / `404 not_found` |
| `matchId` exists, shares the game, is not `completed` or `cancelled`, and the player is seated in it | `403 forbidden` / `404 not_found` |
| the organization is under its `sessions_created` monthly quota | `429 rate_limited` |

Sessions are also rate limited per api key:
`SESSION_RATE_LIMIT_PER_MINUTE`, 600 a minute by default.

## Expiry

`expiresAt` is the moment the session was opened plus the `sessionDurationSeconds`
of the config snapshot. Anything other than an integer between 60 and 86 400
falls back to 3 600 seconds rather than refusing the session, so a typo in a
config widens the window instead of breaking play.

A session row is `active`, `ended`, or `expired`. Nothing marks a session
`expired` when it is only read: the worker's session sweep flips `active` rows
whose `expiresAt` has passed, so an abandoned round stops counting on its own.
A score sent to an `expired` session is refused with `403 forbidden` "the game
session has expired" and a `score.expired` webhook is dispatched, with the
attempted score in its payload.

## Read one

`GET /api/v1/sessions/{sessionId}` (`session:read`) answers
`{ "session": … }` with the same view, minus the token. The `config` field is
the snapshot the session was opened with, so a config edited afterwards does not
change how a past round is judged. A callback secret inside that snapshot is
never included.

## End one

`POST /api/v1/sessions/{sessionId}/end` (`session:update`) sets
`ended`, records `endedAt`, dispatches `session.ended`, and queues the score pack
for the session. Ending an already-ended session returns its current view
instead of failing, so a client can retry safely.

Submitting a score with `"endSession": true` ends the session in the same call.

## Session events

`GET /api/v1/sessions/{sessionId}/events` (`score:read`) answers
`{ "source": "redis" | "r2", "events": [{ "seq": 1, "type": "…", "at": 0, "data": … }] }`.

`source` is `r2` when the session's score row was archived: the events are then
read out of the packed object by byte range and zstd-decompressed. It is `redis`
while the live list is still there. A session with no score row is
`404 not_found`: "score not found".

Worth knowing before you build on it: nothing in this repository appends to the
event store. The realtime gateway broadcasts `peer.event` to the room and does
not persist it, so `events` is empty unless your own ingestion writes to the
`SessionEventStore`. The read path, the seven-day Redis list and the archive are
all in place; the writer is yours.
