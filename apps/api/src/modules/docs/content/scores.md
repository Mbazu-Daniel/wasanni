---
title: Scores
summary: Two ways to record a score, one score per session, and every flag that can mark it.
order: 40
---

# Scores

## Two doors, one row

The server door needs a platform key; an organization key cannot carry
`score:create` (see [Credentials](/docs/auth)).

| | client | server |
|---|---|---|
| route | `POST /api/v1/play/sessions/{sessionId}/score` | `POST /api/v1/sessions/{sessionId}/score` |
| credential | `authorization: Bearer <sessionToken>` | `x-api-key` with `score:create` |
| `source` recorded | `client` | `server` |
| rate limit | `SCORE_RATE_LIMIT_PER_MINUTE` per session (120 by default) | none |
| verification | runs when the config asks for it | never runs |

Body for both:

```json
{ "score": 420, "endSession": true }
```

`score` is a number from 0 up to `Number.MAX_SAFE_INTEGER`; `endSession`
defaults to false and, when true, ends the session after the score is stored.
Both answer `201 { "score": … }`.

A score sent over the realtime websocket goes through the client door, so it
carries the `client_source` flag like any other client submission.

## One score per session

Rows are unique on `(sessionId, hourBucket)` and `hourBucket` is the clock hour
of the session's `startedAt`. A second submission for the same session does not
replace the number: the existing row is returned with the new flags merged in
and `resubmitted` added.

So the score your client sends first is the score that ranks. Send the final
number, or send it from your server once you have checked it.

## The stored score

```json
{
  "id": "01J9…", "organizationId": "01J9…", "sessionId": "01J9…", "platformId": "01J9…",
  "gameId": "01J9…", "externalUserId": "player-1", "mode": "ranked",
  "score": 420, "status": "accepted",
  "flagged": false, "flags": [], "source": "server",
  "verificationStatus": "not_required", "verificationReason": null,
  "submittedAt": "…"
}
```

`status` is `accepted` or `hidden`; only `accepted` rows reach a leaderboard.
`verificationReason` is the verifier's own words for a score it did not accept
or could not read: `the screen showed 1840, the submission claimed 2400`: and
null when the score passed or was never checked.

## Flags

| flag | set when |
|------|----------|
| `client_source` | the score came through the session token |
| `late` | `submittedAt` is after the session's `expiresAt` |
| `resubmitted` | the session already had a score row |
| `max_score_exceeded` | the config sets `rules.maxScore` and the score is above it, and `rules.checks` includes `max_score` |
| `score_rate_exceeded` | the config sets `rules.maxScorePerSecond` and `score / secondsSinceStart` is above it, and `rules.checks` includes `score_rate` |
| `verification_failed` | a verifier said the score is not what it claims: a callback answered `{"valid": false}`, a referee read a different number on screen, or the game asked for a frame and none arrived |
| `verification_unavailable` | the verifier was unreachable, too slow, unreadable, or answered something that was not a verdict |
| `screenshot_missing` | the config asks for a frame and the submission carried none, so it always arrives with `verification_failed` |
| `callback_verified` | the callback answered `{"valid": true}` |
| `vision_verified` | the frame on screen showed the submitted number |
| `vision_mismatch` | the frame on screen showed a different number than the submitted one |

`flagged` is true when any of `late`, `resubmitted`, `max_score_exceeded`,
`score_rate_exceeded`, `verification_failed` is present. A verifier that cannot
answer sets `verification_unavailable` and leaves `verificationStatus` at
`unavailable`, but it does not flag: Wasanni does not hide a player's run
because its own referee was slow. `client_source`, `callback_verified`,
`vision_verified` and `vision_mismatch` are recorded but never flag: the first
is a fact about the door, the rest are good news or the reason for news that
already flagged.

Rules and thresholds come from the config snapshot the session was opened with,
under `rules.checks`, `rules.maxScore` and `rules.maxScorePerSecond`. When
`rules.checks` is absent, both checks are on.

Flagged scores stay in the row and are visible with `includeFlagged=true` on the
leaderboard; they are excluded from the default view.

## Callback verification

Set it on the game config:

```json
{
  "scoreVerification": {
    "mode": "callback",
    "callback": { "url": "https://game.example/verify", "secret": "at least 16 characters", "timeoutMs": 3000 }
  }
}
```

Verification only runs on client submissions, and it is on unless the
deployment turns `SCORE_VERIFICATION_ENABLED` off: a deployment with it off
treats every session's mode as `none` before the score is even looked at.

For each score the API POSTs to your url:

```json
{
  "event": "score.verify",
  "sessionId": "01J9…",
  "organizationId": "01J9…",
  "externalUserId": "player-1",
  "score": 420,
  "submittedAt": "…"
}
```

with `x-wasanni-verify-timestamp` (unix seconds) and
`x-wasanni-verify-signature: t=<ts>,v1=<hex>`, where `<hex>` is
`HMAC-SHA256(secret, "<ts>." + raw body)`. Sign the bytes you received, not the
object you parsed.

Answer `{"valid": true}` to accept, or `{"valid": false, "reason": "…"}` to
refuse. Anything else: a non-2xx, a timeout past `timeoutMs` (3 000 by default),
a body that is not a verdict: records `verification_unavailable` and the score
ranks. A missing secret, a callback block the config does not carry, or a url
that resolves to a private address (unless `ALLOW_PRIVATE_OUTBOUND_URLS` is set)
is a configuration that cannot verify anyone, so it also records
`verification_unavailable` rather than blaming the player. Only a verdict that
says the score is wrong records `verification_failed`.

`verificationStatus` is one of `not_required`, `passed`, `failed`, `unavailable`.

## Vision verification

A referee that looks at the screen. Set it on the game config:

```json
{ "scoreVerification": { "mode": "vision", "timeoutMs": 8000 } }
```

The client then sends the last frame with the score, as a data url:

```json
{ "score": 1840, "endSession": true, "screenshot": "data:image/png;base64,…" }
```

Capture the frame where the game already draws the final score. A canvas game
takes its own pixels; anything else photographs the element:

```js
const screenshot = canvas.toDataURL("image/jpeg", 0.7);

await fetch(`/api/v1/play/sessions/${sessionId}/score`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${sessionToken}` },
  body: JSON.stringify({ score, endSession: true, screenshot }),
});
```

`png`, `jpeg` or `webp`, at most 300 000 characters of base64. Wasanni puts the
frame and the submitted number in front of a vision model and asks it for the
score the screen shows. When the two agree the score records
`vision_verified`; when they disagree it records `verification_failed` plus
`vision_mismatch`, and `verificationReason` says both numbers, as in `the screen
showed 1840, the submission claimed 9990`. A flagged score leaves the default
leaderboard view.

A submission with no screenshot fails closed as `screenshot_missing`: a game that
promised a frame and sent none has nothing to check. A frame the referee cannot
read: no score on screen, a low-confidence read, a model that is slow or
refusing: records `verification_unavailable` and keeps the player's rank,
because the referee failing is not the player failing. Vision never passes on
silence either way: an unread frame is never marked `vision_verified`.

The model is the platform's own: `AGENT_API_KEY`, `AGENT_BASE_URL` and
`AGENT_MODEL` on the API process. No developer key is involved and nothing is
sent to a url you configured. `timeoutMs` covers the model call, between 100
and 20 000, 8 000 by default.

What it proves is that the pixels said 1840. It does not prove the run was
fair: a game can draw a fake HUD, and a bot can screenshot an honest frame it
never earned. Use it next to the rule checks and the session clock, and treat a
mismatch as a signal to look, not as a verdict on a player.

## Scores inside a match

If the session was opened with a `matchId`, the stored score is also written onto
that match's participant row, which is how a bracket advances itself. A failure
to record it there does not lose the score.

## Hiding a player's scores

`POST /api/v1/players/{externalUserId}/scores/hide` with `score:hide`
and an optional body `{ "gameId": …, "platformId": … }` flips that player's
`accepted` scores to `hidden`, in batches, and answers `{ "hidden": 5 }`.
Without `platformId` every platform of your organization is hidden from; each
platform gets its own `score.hidden` webhook. Hidden scores leave the
leaderboard; the rows stay, so an audit can still read them.
