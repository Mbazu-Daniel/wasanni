---
title: Credentials
summary: Api keys and session tokens: who sends which, where, and what happens when it is the wrong one.
order: 20
---

# Credentials

## The api key

Send it as `x-api-key` on every `/api/v1/*` call.

```
x-api-key: sk_…
```

A key is an `sk_…` secret shown once at creation. The API stores only its
SHA-256 hash, and `prefix` in listings names the key's family: `sk_org_` for
an organization key, `sk_plt_` for a platform key: enough to tell two keys
apart, not enough to use one.

One key belongs to exactly one organization and acts as that organization. The
API reads the organization off the key, so a call never passes an organization
id it is not already asked for: and a key can never reach another
organization's data. An organization key reaches the management routes; a
platform key additionally names the platform it was minted for (`"scope":
"platform"` with a `"platformId"`) and reaches the data plane: sessions,
scores, leaderboards, tournament enters, match results, usage.

### Where the platform comes from

An organization key is not tied to a platform; a platform key names its
platform at creation. Calls that act on one platform name it:

- writes and identity ops carry `platformId` in the body: opening a session,
  joining or leaving a tournament, declaring a match winner;
- reads default to the whole organization and narrow with an optional
  `?platformId=` filter: the leaderboard, a game's configs and files;
- platform-in-path routes: `/api/v1/platforms/{platformId}/games`,
  `/api/v1/platforms/{platformId}/usage`, webhooks: are checked against your
  organization, and a platform of someone else's is `404 not found`;
- routes addressed by a session id derive the platform from the stored
  session: reading, ending, scoring a session needs no platform argument.

The API refuses a `platformId` outside your organization and one a game is not
assigned to.

### What a key may do

A key carries a map of grants, `{ resource: action[] }`, e.g.
`{"score": ["create", "read"]}`. Each route asks for one permission
(`session:create` for opening a session, `score:create` for a server score,
`score:read` for the leaderboard, `match:complete` for declaring a winner).
A key without it gets `403 forbidden` / `missing permission: score:read`.

Resources are `organization`, `member`, `invitation`, `platform`, `apiKey`,
`game`, `gameFile`, `assignment`, `gameConfig`, `template`, `session`, `score`,
`webhook`, `tournament`, `match`, `agent`, `audit`, `role`. Actions are
`create`, `read`, `update`, `delete`, `cancel`, `publish`, `hide`, `complete`,
`register`, `seed`, `start`.

Scope is enforced twice: at creation and at the route. An organization key
cannot be granted `session` or `score` at all, and a platform key cannot be
granted management permissions. Past creation, the macros enforce the rest: a
platform route (`platformAuth`) admits only platform keys bound to a
platform, and a management route (`organizationAuth`) admits member sessions
and organization keys only. A platform write binds to the key's platform — a
caller-supplied `platformId` naming another platform is refused — while reads
stay organization-wide.

The grants decide how far the key reaches. A key holding only the play-loop
scopes: sessions, scores, tournaments, matches: works entirely on your
organization's platforms. An organization key granted management scopes can
also drive the organization's management routes; the dashboard's **Select
all** produces a key that acts like an organization owner. Mint that one deliberately and with
a short expiry, because anything leaked from it can rewrite the organization.

### Creating one

Keys are minted by signed-in members, never by other keys: the dashboard's
API keys page and each platform's page call `POST
/api/v1/organizations/:organizationId/keys` for you, and over the API the call
needs a member session with `apiKey:create`. Name it, pick an expiry: 1, 7,
30, 90 or 365 days, or Never: and grant scopes:

```json
{ "name": "arcade runtime", "scope": "platform", "platformId": "01J9…", "permissions": { "session": ["create", "read"], "score": ["create", "read"] } }
```

Omit `"scope"` for an organization key and `"platformId"` with it. Session
and score are the platform's permissions: granting either on an organization
key is refused at creation with `400 bad_request` and `an organization api key
cannot grant session, score: use a platform api key`. A platform key without a
`"platformId"` is refused with `400 a platform api key needs a platformId`.
The secret appears exactly once and is never returned again.

A pair the API does not know is refused at creation: `400 bad_request` with
`unknown permission: score:write`.

### Rotating and revoking

- The dashboard disables a key immediately (`PATCH
  /api/v1/organizations/:organizationId/keys/:keyId` with `{"enabled":
  false}`) or deletes it (`DELETE` the same path).
- There is no endpoint that returns a lost secret. Create a second key, then
  revoke the first.

## The session token

`POST /api/v1/sessions` answers with `sessionToken`, a 43-character
base64url token returned once per session. The game client sends it as:

```
authorization: Bearer <sessionToken>
```

Only `POST /api/v1/play/sessions/{sessionId}/score` accepts it, and only for
that one session: the token is hashed and looked up, and a token whose session
is `ended` or `expired` is refused (`403 forbidden`). It cannot read the
leaderboard, cannot open another session, and is not a substitute for the api
key.

Keep it in the game client for the length of the round. Never log it, and never
put it in a leaderboard row or a webhook payload: it is a credential, not data.

## The dashboard sign-in

The dashboard authenticates its own pages with the browser session it got when
you signed in. An integration never handles that cookie: every call a game or
a backend makes is answered by the api key alone.

## The wrong credential

| request | answer |
|---------|--------|
| `/api/v1/*` with no `x-api-key` | `401 unauthenticated`: "an api key is required" |
| `/api/v1/*` with a revoked or unknown key | `401 unauthenticated`: "the api key is not valid" |
| `/api/v1/play/…/score` with no bearer token | `401 unauthenticated`: "a session token is required" |
| `/api/v1/play/…/score` with a foreign token | `401 unauthenticated`: "the session token is not valid" |
| a key missing the permission a route asks for | `403 forbidden`: "missing permission: score:read" |
| a key used against another organization | `403 forbidden`: "the api key belongs to another organization" |
| an organization key on a platform route | `403 forbidden`: "a platform api key is required" |
| a platform key on a management route | `403 forbidden`: "an organization api key is required" |
| a dashboard cookie on a platform route | `401 unauthenticated`: those routes read the key, not the cookie |

## Tracing a call

Send `x-request-id: <8–64 characters of [A-Za-z0-9_-]>` and the API echoes it
back on the response and in every error body. A value outside that pattern is
replaced by a server-generated uuid, so a trace that must survive is one that
matches. The response header is `x-request-id`.

Browser calls need the origin to be listed in the server's `WEB_ORIGINS`; the
API allows `Content-Type`, `Authorization`, `X-Request-Id` and `X-API-Key`, and
exposes `X-Request-Id` and `Set-Cookie`.
