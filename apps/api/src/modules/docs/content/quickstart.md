---
title: Quickstart
summary: The calls a game makes, from api key to leaderboard row: and the one credential they carry.
order: 10
---

# Quickstart

Everything below runs against a local API on `http://localhost:3000`. Replace
the base url with your deployment, and `GAME_ID` / `PLATFORM_ID` / `SESSION_ID`
with the ids the responses and the dashboard's platform page give you.

Your integration carries one credential: an **api key**, sent as
`x-api-key` on every call. The key acts as your whole organization:
organization routes address the organization in their path, calls that act on
one platform name its `platformId`, and the API checks both against the key.
The dashboard sign-in is a separate thing that stays in the browser.

## 1. Set the workspace up

In the dashboard, once: each step names the endpoint the dashboard calls, so
an integration can drive the same flow with a signed-in member session:

1. Create a platform (`POST /api/v1/organizations/:organizationId/platforms`):
   a name and a slug of 2–60 characters of `[a-z0-9-]`. The slug never
   changes afterwards: deploy urls embed it.
2. Create a game (`POST /api/v1/organizations/:organizationId/games`).
   `hosting: "external"` is a game you serve yourself; `hosting: "hosted"`
   needs an uploaded game file that reaches `ready`. The game slug never
   changes afterwards either. A game also carries a
   cover image and a list of short `hints` (up to 20 strings), both optional
   and set from the dashboard's game settings.
3. Assign the game to the platform (`POST
   /api/v1/organizations/:organizationId/games/:gameId/assignments`) and
   publish it (`POST
   /api/v1/organizations/:organizationId/games/:gameId/publish`). A session
   only opens on a game that is assigned to the named platform, `active`, and
   published.
4. Open a leaderboard tournament for the game (`POST
   /api/v1/organizations/:organizationId/tournaments` with the game's
   `gameId`, `"format": "leaderboard"`, and the game's name and slug,
   then `POST …/:tournamentId/open`). Every game ships with one, so every
   session and score names a tournament and every score counts on its board.
5. Create a platform api key on that platform's page
   (`POST /api/v1/organizations/:organizationId/keys` with `"scope":
   "platform"` and the platform's `"platformId"`). Tick the scopes the
   calls below need: `session: create`, `session: read`, `score: create`,
   `score: read`: and pick an expiry: 1, 7, 30, 90 or 365 days, or Never.
   The calls below are the platform's data plane, so they need a platform key:
   an organization key is refused them at creation with `400 an organization
   api key cannot grant session, score: use a platform api key`.

The secret is shown exactly once, at creation:

```json
{ "apiKey": { "id": "3f2f6c9e-…", "name": "arcade runtime", "scope": "platform", "platformId": "01J9…", "prefix": "sk_plt_", "key": "sk_…", "expiresAt": null } }
```

Store it as a secret. The API keeps only a SHA-256 hash, so a lost key is
recreated, not recovered. A key belongs to one organization; a platform key
additionally names the platform it was minted for. Every id the API returns is
a UUID.

## 2. Open a session for a player

```bash
curl -s -X POST http://localhost:3000/api/v1/sessions \
  -H "x-api-key: $WASANNI_API_KEY" -H 'content-type: application/json' \
  -d "{\"gameId\":\"$GAME_ID\",\"platformId\":\"$PLATFORM_ID\",\"externalUserId\":\"player-1\",\"mode\":\"ranked\"}"
```

```json
{
  "session": { "id": "ses_…", "status": "active", "expiresAt": "…", "config": { … } },
  "sessionToken": "…",
  "realtimeUrl": "ws://localhost:3001/rt/ses_…?token=…",
  "joinCode": "K7qZ2mX4pQ",
  "playUrl": "http://localhost:3000/s/arcade/drift-kings/?tournamentId=trn_…&externalUserId=player-1&code=K7qZ2mX4pQ"
}
```

`sessionToken` is returned only here. Your backend never needs it, because it
already holds the api key. Hand the player the `joinCode`: a 10-character code
that opens the same session over the socket or the score endpoint, and that
dies with the session. Or hand over the `playUrl`: the platform's current
build with the session already attached. The default session lasts 30 minutes;
after that no score and no join code is accepted for it again.

## 3. Record the score

From the game client, with the session token:

```bash
curl -s -X POST http://localhost:3000/api/v1/play/sessions/$SESSION_ID/score \
  -H "authorization: Bearer $SESSION_TOKEN" -H 'content-type: application/json' \
  -d '{"score":420,"endSession":true}'
```

Or from your backend, with the api key, which skips the per-session rate limit:

```bash
curl -s -X POST http://localhost:3000/api/v1/sessions/$SESSION_ID/score \
  -H "x-api-key: $WASANNI_API_KEY" -H 'content-type: application/json' \
  -d '{"score":420}'
```

Both answer `201 { "score": … }` with the stored score, its `flags` and its
`verificationStatus`.

## 4. Read the leaderboard

```bash
curl -s "http://localhost:3000/api/v1/games/$GAME_ID/leaderboards?limit=10" \
  -H "x-api-key: $WASANNI_API_KEY"
```

```json
{ "entries": [ { "rank": 1, "sessionId": "ses_…", "externalUserId": "player-1", "score": 420, "flagged": false, "submittedAt": "…" } ] }
```

The board is addressed by the game in the path and spans every platform of
your organization; `?platformId=` narrows it to one and each entry carries a
`platformId`.

## Let an agent run the integration

The routes above are also an mcp server. Point Claude, Cursor, or any
other mcp client at one entry and it can open sessions, submit scores, read
leaderboards, join players and finish matches on your behalf:

```json
{
  "mcpServers": {
    "wasanni": {
      "command": "bun",
      "args": ["apps/mcp/src/index.ts"],
      "env": {
        "WASANNI_BASE_URL": "http://localhost:3000",
        "WASANNI_API_KEY": "sk_plt_…"
      }
    }
  }
}
```

The server takes a platform key and nothing else: every tool calls the
session, score, tournament, match, and usage routes, which organization keys
cannot reach. It acts as the organization of the key. Tools that write or identify a player take a `platformId` argument, and no
tool accepts an organization id. Each tool names the
permission its call needs, and a call the key lacks that permission for answers
`403 missing permission: <name>`.

Two tools exist for reading before writing. `integration_guide` returns the
pages you are reading now, which is the first thing to call. `api_docs` returns
this api's own openapi document: no argument lists every `METHOD /path`, and
`{"path": "/api/v1/sessions/:sessionId/score"}` returns that route's
request and response schemas. A base url that does not answer
`GET <base>/api/v1/docs` with json is the reason an api_docs call fails: fix the
url, do not write the request from memory.

## Next

- `auth`: key permissions, rotation, what a token may and may not do.
- `sessions`, `scores`, `leaderboards`: the full play loop and its rules.
- `webhooks`: hear about a score instead of polling for it.
- `errors`: the error body every refusal uses.
