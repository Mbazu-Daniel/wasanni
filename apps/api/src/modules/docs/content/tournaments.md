---
title: Tournaments
summary: Create and open a tournament, enter players into it, and read its leaderboards or bracket.
order: 80
---

# Tournaments

A tournament belongs to one game and holds players registered from one platform.
It runs in one of two formats and moves through five statuses.

| format | how a winner is decided |
|--------|-------------------------|
| `leaderboard` | accepted scores rank the registered players; you close it when you are done |
| `bracket` | seeded matches of two; each completed match advances its winner |

| status | means |
|--------|-------|
| `draft` | created, nobody can register |
| `open` | registrations accepted, seeding allowed |
| `running` | a bracket is seeded and its matches exist |
| `completed` | finished, `completedAt` set |
| `cancelled` | stopped; every unfinished match of it is cancelled too |

`create` always lands on `draft`, so a half-configured tournament cannot take
players. `startedAt` is set by seeding, `completedAt` by finishing.

## Routes

Two endpoints create a tournament. Both require permission
`tournament:create` and always create the tournament in draft status (or
`scheduled` when `startsAt` is in the future).

`POST /api/v1/tournaments` is the platform route, addressed by a platform key
in `x-api-key` and bound to that platform's assignment. This is the route
external developers — and the sdk — use. `POST
/api/v1/organizations/:organizationId/tournaments` is the management route,
addressed by the member session or an organization key in `x-api-key`. It is
internal: the dashboard drives it, and an integration never needs it.

The management surface, one row per lifecycle step:

| method | path | permission |
|--------|------|-----------|
| `GET` | `/api/v1/organizations/:organizationId/tournaments` | `tournament:read` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments` | `tournament:create` |
| `GET` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}` | `tournament:read` |
| `PATCH` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}` | `tournament:update` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/open` | `tournament:start` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/seed` | `tournament:seed` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/cancel` | `tournament:update` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/complete` | `tournament:update` |
| `GET` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/participants` | `tournament:read` |
| `POST` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/participants` | `tournament:register` |
| `DELETE` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/participants/{participantId}` | `tournament:register` |
| `GET` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/standings` | `tournament:read` |
| `GET` | `/api/v1/organizations/:organizationId/tournaments/{tournamentId}/bracket` | `tournament:read` |

The platform surface below is the integration path, all addressed by a
platform key in the `x-api-key` header, which already names the organization
and the platform: no route takes an `organizationId` or a `platformId`. A
tournament created through `POST /api/v1/tournaments` is bound to the key's
platform — the game must already be assigned to it (`404 the game is not
assigned to this platform`) and a foreign `assignmentId` is refused (`400
assignmentId does not belong to this platform and game`). The other write
routes answer `404` for tournaments of any other platform. Reads name players
by `externalUserId` instead of by participant id:

| method | path | permission |
|--------|------|-----------|
| `GET` | `/api/v1/tournaments` | `tournament:read` |
| `POST` | `/api/v1/tournaments` | `tournament:create` |
| `GET` | `/api/v1/tournaments/{tournamentId}` | `tournament:read` |
| `PATCH` | `/api/v1/tournaments/{tournamentId}` | `tournament:update` |
| `POST` | `/api/v1/tournaments/{tournamentId}/open` | `tournament:start` |
| `POST` | `/api/v1/tournaments/{tournamentId}/seed` | `tournament:seed` |
| `POST` | `/api/v1/tournaments/{tournamentId}/cancel` | `tournament:update` |
| `POST` | `/api/v1/tournaments/{tournamentId}/complete` | `tournament:update` |
| `POST` | `/api/v1/tournaments/{tournamentId}/enter` | `tournament:register` |
| `DELETE` | `/api/v1/tournaments/{tournamentId}/players/{externalUserId}/leave` | `tournament:register` |
| `GET` | `/api/v1/tournaments/{tournamentId}/leaderboards` | `tournament:read` |
| `GET` | `/api/v1/tournaments/{tournamentId}/bracket` | `tournament:read` |

`GET /api/v1/tournaments` takes an optional `gameId` and an optional `status`,
and returns `open` tournaments of your platform's organization by default,
newest first. Pass `status=draft` to see the tournaments still being set up.

## Create

Two endpoints, one body. Both require `tournament:create` and both answer
`201 { "tournament": … }` in `draft` (`scheduled` when `startsAt` is in the
future). The platform route takes the platform key and binds the tournament
to that platform's assignment; the management route takes the member session
or organization key and leaves the assignment to the caller.

The dashboard's tournament form posts to `POST /api/v1/organizations/:organizationId/tournaments` with:

```json
{
  "gameId": "01J9…",
  "name": "Friday Sprint",
  "slug": "friday-sprint",
  "format": "leaderboard",
  "maxParticipants": 64,
  "startsAt": "2026-11-01T18:00:00Z",
  "endsAt": "2026-11-01T20:00:00Z"
}
```

A game server posts the same body, minus `assignmentId`, to
`POST /api/v1/tournaments` with its platform key. The game must already be
assigned to that platform, and the created tournament is bound to the
assignment, so `enter` works for it straight away.

`name` is 1-120 characters. `slug` is 2–60 characters of `[a-z0-9-]` grouped by
hyphen, and must be unique in the organization: a clash is `409 tournament slug
already exists`. `description` takes 2 000 characters. `maxParticipants` is
2–256 or omitted for no cap. `startsAt` and `endsAt` are informational
timestamps; nothing in the API opens or closes a tournament on the clock.

Three optional ids pin what the players run against: `assignmentId` (which
platform owns the game), `gameConfigId` (a saved configuration), and
`templateId`. Each is validated as belonging to your organization, and the
answer names them back as `assignmentId`, `gameConfigId`, `templateId`.

A created tournament answers `201 { "tournament": … }`. The view also carries
`game` and `platform` objects so a listing does not need a second call.

`PATCH` changes `name`, `slug`, `description`, `maxParticipants`, `startsAt`,
`endsAt`, `gameConfigId`, and `templateId`. `description`, `maxParticipants`,
`startsAt`, `endsAt`, `gameConfigId`, and `templateId` accept `null` to clear
them. A `completed` tournament refuses with `409 a finished tournament cannot
be edited`.

## Open, then enter

`POST …/open` moves `draft` to `open` and nothing else: any other status is
`409 only a draft tournament can be opened`.

Entering a tournament registers the player and opens their play session in one
call, addressed by the platform they play on:

```json
{ "platformId": "01J9…", "externalUserId": "player-8842", "displayName": "Ada" }
```

`POST /api/v1/tournaments/{tournamentId}/enter` answers `201 { "session": …,
"sessionToken": …, "realtimeUrl": …, "joinCode": …, "playUrl": … }`: the same
fields a game session create returns, so the player can connect and start
playing immediately. Give the player the 10-character `joinCode`; it resolves
at `GET /api/v1/join/:code` and authenticates exactly like the token.
Entering the same `externalUserId` twice is not an error: an existing
registration comes back as-is and the call issues a fresh session and token.

A leaderboard tournament's enter binds the session to the tournament, so
scores rank the player. A bracket tournament behaves the same while it is
still `open`, so players register and play before the bracket is seeded. Once
it is `running`, the enter seats the player into their open match instead, and
the answer also carries `matchId` and `opponent` (the opponent's
`externalUserId`, or `null`). In a running bracket, a player with no open
match seat: not yet seeded into one, or done with theirs: gets `409 no open
match seats this player yet`.

Registration is closed outside `open`: `409 registration is not open`: and a
full tournament answers `409 tournament is full` once `maxParticipants` players
hold `registered`. A withdrawn player entering again revives the registration
with `status: "registered"` and `withdrawnAt: null`.

`DELETE …/participants/{participantId}` (dashboard) and `DELETE …/players/
{externalUserId}/leave` with the body `{ "platformId": … }` answer `204`. Leaving after the tournament is
finished is `409 a
finished tournament cannot be withdrawn from`. In a running bracket, withdrawal
marks the player `disqualified` in every unfinished match they sit in, and the
match settles for whoever is left if exactly one player remains.

## Leaderboard tournaments

Bind each session to the tournament with `tournamentId`, and scores rank the
players: see [Sessions](/docs/sessions) and [Scores](/docs/scores).

`GET /api/v1/tournaments/{tournamentId}/leaderboards` answers `{ "rows":
[…] }`, one row per `registered` participant, best accepted score first. The
dashboard's `GET
/api/v1/organizations/:organizationId/tournaments/{tournamentId}/standings`
answers the same rows wrapped as `{ "format": "leaderboard", "rows": […]
}`: and `{ "format": "bracket", "bracket": … }` for a bracket one:

```json
{
  "position": 1,
  "participantId": "01J9…",
  "externalUserId": "player-8842",
  "displayName": "Ada",
  "seed": null,
  "status": "registered",
  "score": 18400,
  "flagged": false,
  "flags": [],
  "submittedAt": "2026-11-01T19:12:44Z"
}
```

A player with no accepted score still gets a row, with `score: null`, and sorts
below everyone who has one. Ties break on `seed`, then earliest `submittedAt`,
then `externalUserId`. Withdrawn and eliminated players are not listed.

`POST …/complete` closes it: `409 only a leaderboard tournament can be completed
directly` for a bracket, `409 only an open tournament can be completed` once it
has run, `409 a cancelled tournament cannot be completed` after a cancel. It
sets `completed` and `completedAt` and leaves the scores as they were.

## Bracket tournaments

Order of play: create with `"format": "bracket"`, `open`, enter at least two
players, then `POST …/seed`.

Seeding sorts the registered players by `seed` then registration time, assigns
them seeds 1..n in that order, and builds a single-elimination bracket whose
size is the next power of two, up to 256 players. It sets the tournament to
`running` and answers the bracket:

```json
{
  "bracket": {
    "tournamentId": "01J9…",
    "bracketSize": 8,
    "totalRounds": 3,
    "currentRound": 1,
    "rounds": [
      { "round": 1, "matches": [ { "id": "01J9…", "bracketSlot": 0, "participants": [] } ] }
    ]
  }
}
```

Each match carries `nextRound`, `nextSlot` and `nextSide`: where its winner is
seated next: and the final round carries `null` for all three. Seed 1 plays the
highest seed the bracket can pair it with, so the strongest players meet late.

Where the bracket is larger than the field, a first-round match gets one player
only: it is stored `completed` immediately and that player is seated in the next
round. That is a bye, and it is the answer's `status: "completed"` with
`winnerParticipantId` set that tells you so.

Seeding refuses when it cannot start a bracket: `400 only a bracket tournament
has a bracket`, `409 the tournament must be open before seeding`, `409 the
tournament bracket has already been seeded`, and `400 a bracket needs at least 2
registered participants`.

From there you play matches: see [Matches](/docs/matches). `GET …/standings` for
a bracket returns `{ "format": "bracket", "bracket": … }`: the same body as
`GET …/bracket`, which an api key also reads. `GET …/bracket` is `400 only a
bracket tournament has a bracket` for a leaderboard tournament, and
`GET …/leaderboards` is `409 only a leaderboard tournament has a leaderboard`
for a bracket one.

A bracket finishes on its own. When every match of the final round is completed,
the winner's registration becomes `winner` and the tournament becomes
`completed`. Do not call `complete` on one.

`POST …/cancel` works from any status except `completed` (`409 a completed
tournament cannot be cancelled`) and cancels its `pending` and `active` matches
in the same transaction.

## Duels

A duel is a match of two that no tournament owns: the caller never names a
tournament, only a game. `POST /api/v1/duels/enter` with permission
`session:create` and the body `{ "platformId": …, "gameId": …,
"externalUserId": … }` (plus optional `externalName` and `configId`) pairs the
player into the duel pool of that game:

- a waiting duel match created within the last five minutes with one free seat
  gets the player in its other seat and becomes `active`;
- otherwise a fresh pending match opens with the player seated, and the answer
  carries `matchId` and `opponent: null` until someone enters against it;
- the player already holding a seat in a recent duel match keeps it and simply
  gets a new session.

The answer is `201 { "matchId": …, "opponent": …, "session": …, "sessionToken":
…, "realtimeUrl": …, "joinCode": …, "playUrl": … }`. When two seatings race
for the same last free seat, the loser gets `409 the pairing just changed,
enter again`.
