---
title: Webhooks
summary: Signed deliveries of scores and sessions, their retries, and how to check them.
order: 70
---

# Webhooks

A webhook is a url a platform subscribes to event types. The API POSTs JSON to
it when something happens, signs the body, and retries when your endpoint does
not answer `2xx`.

## Events

| type | `data` |
|------|--------|
| `session.created` | the session view, no token |
| `session.ended` | `{ sessionId, gameId }` |
| `score.submitted` | the score view |
| `score.expired` | `{ sessionId, gameId, externalUserId, score: null, attemptedScore, reason: "session_expired", expiresAt, submittedAt }` |
| `score.hidden` | `{ externalUserId, gameId, hiddenCount }` |
| `webhook.test` | `{ webhookId }` |

A player who entered a duel or tournament (`POST /api/v1/duels/enter`, `POST
/api/v1/tournaments/{tournamentId}/enter`, see `tournaments`) sends scores over
the session websocket. You do not watch that socket to keep rankings current:
`score.submitted` and `session.ended` tell your server a number landed or a
round closed, and the leaderboard is computed live when you read it: a webhook
never carries a stored rank to update.

## Create one

Webhooks are configured in the dashboard, on your platform's webhooks page:
or over the API with an organization key carrying the `webhook` scopes:

| method | path | permission |
|--------|------|-----------|
| `GET` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks` | `webhook:read` |
| `POST` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks` | `webhook:create` |
| `GET` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks/{webhookId}` | `webhook:read` |
| `PATCH` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks/{webhookId}` | `webhook:update` |
| `DELETE` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks/{webhookId}` | `webhook:delete` |
| `POST` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks/{webhookId}/test` | `webhook:update` |
| `POST` | `/api/v1/organizations/:organizationId/platforms/{platformId}/webhooks/{webhookId}/rotate-secret` | `webhook:update` |
| `GET` | `/api/v1/organizations/:organizationId/webhooks` | `webhook:read` |
| `GET` | `/api/v1/organizations/:organizationId/webhooks/{webhookId}/deliveries` | `webhook:read` |

The form takes a url, the events to subscribe to, a description, and an
expiry: 1 to 365 days, or Never; a webhook past its expiry receives no
further deliveries. A platform cannot hold the same url twice: `409 this
platform already has a webhook for that url`.

```json
{
  "url": "https://game.example/wasanni",
  "events": ["score.submitted", "session.ended"],
  "description": "rankings worker",
  "enabled": true
}
```

`events` holds 1–20 names from the table above, `url` is a uri up to 2 000
characters, and `enabled` defaults to true. The answer is:

```json
{ "webhook": { "id": "01J9…", "secretLast4": "ab12", … }, "secret": "whsec_…" }
```

`secret` is `whsec_` plus 24 random bytes in base64url, shown once. The stored
copy is encrypted, and `secretLast4` is all the API will ever show again. A
platform cannot have the same url twice: `409 conflict`.

The dashboard also:

- lists (`GET …/webhooks`) and reads (`GET …/webhooks/{webhookId}`) each
  webhook and its config.
- edits url, description, events or enabled (`PATCH …/webhooks/{webhookId}`)
: at least one field.
- rotates the secret (`POST …/webhooks/{webhookId}/rotate-secret`), answering
  a new `secret` in the same `{ webhook, secret }` shape. Rotate before
  sharing, and expect the old secret to stop working for deliveries queued
  afterwards.
- queues a `webhook.test` delivery to your endpoint (`POST
  …/webhooks/{webhookId}/test`).
- lists the last 50 delivery attempts (`GET
  /api/v1/organizations/:organizationId/webhooks/{webhookId}/deliveries`),
  newest first, with `attempt`, `status` (`delivered`, `retrying`, `failed`),
  `statusCode`, the response body and error, each truncated to 1 000
  characters.
- unsubscribes a webhook (`DELETE …/webhooks/{webhookId}`).

## The delivery

```json
{ "id": "evt_…", "type": "score.submitted", "createdAt": "…", "data": { … } }
```

Headers:

```
content-type: application/json
user-agent: Wasanni-Webhooks/1
x-wasanni-event-id: evt_…
x-wasanni-event-type: score.submitted
x-wasanni-timestamp: 1730000000
x-wasanni-signature: t=1730000000,v1=<hex>
```

`<hex>` is `HMAC-SHA256(secret, "<x-wasanni-timestamp>." + raw request body)`.
Compute it over the bytes you received: re-serialised JSON will not match, even
one field reordered.

```ts
const expected = createHmac("sha256", secret)
  .update(`${headerTimestamp}.${rawBody}`)
  .digest("hex");

if (!timingSafeEqual(utf8(expected), utf8(receivedV1))) return refuse();
```

The sender puts the same timestamp in both the header and the `t=` part, so they
must match too. Nothing in the API sets a freshness window: comparing
`x-wasanni-timestamp` to your clock is your decision, and a window of a few
minutes is the usual answer.

`id` is the same `evt_…` for every webhook that receives the event, so two
subscribers of `score.submitted` share it. It is unique per event, not per
delivery: the delivery row is keyed additionally by the webhook.

## Retries

The request times out after 10 seconds. Anything but `2xx`, a timeout, or a
connection failure is a failed attempt, retried up to 5 attempts with exponential
backoff from a 5-second base and 20 percent jitter. So a url that is down for a
few minutes still receives its events; a url that is gone for good leaves
`status: "failed"` rows.

Answer fast and return `2xx`: verify the signature, queue the work, and reply.
Doing the work inside the handler risks the timeout and turns a slow database
into a retry storm.

## Disabling

`enabled: false` stops deliveries immediately and keeps the config and its
history. The dispatcher only ever looks at enabled webhooks, so a paused one
silently misses events: resuming it does not replay what it missed.
