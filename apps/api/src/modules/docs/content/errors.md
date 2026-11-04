---
title: Errors
summary: The error body, its codes, request ids, and what to retry.
order: 100
---

# Errors

Every failed call answers the same shape, whatever the route:

```json
{
  "error": {
    "code": "conflict",
    "message": "tournament slug already exists",
    "requestId": "01J9…"
  }
}
```

`message` is written for the person reading it, not for parsing: match on
`code` and the status, and keep `message` for your logs. `details` appears when
the refusal has something structured to say, such as the fields that failed
validation or when a rate limit clears.

## Codes

| code | status | thrown when |
|------|--------|-------------|
| `bad_request` | `400` | the request asks for something the current state forbids |
| `unauthenticated` | `401` | no credential, or one the API cannot read |
| `forbidden` | `403` | the credential is fine but lacks the permission, or the member does not belong |
| `not_found` | `404` | the row is not in your organization, or the path does not exist |
| `conflict` | `409` | the state you are changing has moved: a duplicate slug, a closed tournament |
| `rate_limited` | `429` | too many calls in the window |
| `unprocessable` | `422` | declared, not thrown by any route today |
| `internal` | `500` | the API did not expect this |

A body, query, path parameter, or header that fails its schema is answered
`422` with `code: "bad_request"` and `message: "request validation failed"`.
`details` is the validator's own list, one entry per field:

```json
{
  "error": {
    "code": "bad_request",
    "message": "request validation failed",
    "details": [
      {
        "summary": "Expected string length greater or equal to 3",
        "path": "/name",
        "value": "a",
        "message": "Expected string length greater or equal to 3",
        "errors": []
      }
    ],
    "requestId": "01J9…"
  }
}
```

`path` names the offending field, `value` is what you sent, and a field that
failed more than one rule can appear twice.

A path that exists on no route is `404 { code: "not_found", message: "route not
found" }`. So is a row that belongs to another organization: the API never
confirms that someone else's tournament exists.

## Credentials

| sent | missing or wrong answers |
|------|--------------------------|
| `x-api-key` on a `/api/v1/...` route | `401 an api key is required`, `401 the api key is not valid` |
| `Authorization: Bearer <session token>` | `401 a session token is required`, `401 the session token is not valid` |
| the dashboard's own sign-in on its pages | `401 unauthenticated`, `403 not an organization member` |

A valid credential without the route's permission is `403 missing permission:
tournament:seed`, naming the exact key to grant. See [Auth](/docs/auth) for
creating keys and granting permissions.

Organization management errors come from the auth layer and are mapped onto
these codes, so `YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION` arrives as `403`,
`INVITATION_NOT_FOUND` as `404`, and
`USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION` as `409`, each keeping the
upstream `message`.

## Rate limits

Three routes are limited per minute, and the window resets with the oldest call
in it:

| route | keyed on | default |
|-------|----------|---------|
| submitting a score | the session | 120 |
| creating a session | the api key | 600 |
| reading a leaderboard | the api key | 600 |

```json
{
  "error": {
    "code": "rate_limited",
    "message": "rate limit exceeded; retry in 37s",
    "details": { "retryAfter": 37, "limit": 120, "windowMs": 60000 },
    "requestId": "01J9…"
  }
}
```

`details.retryAfter` is whole seconds. The API does not set a `retry-after`
header, so read it from the body. The limits are configuration, not promises:
`SCORE_RATE_LIMIT_PER_MINUTE` and `SESSION_RATE_LIMIT_PER_MINUTE` set the first
two on a deployment.

When Redis is unreachable the limiter lets the request through rather than
refusing it, so a limit is not a control: it is a guardrail for a healthy
deployment.

## Request ids

Every response carries `x-request-id`. Send your own to have it echoed back;
anything matching `^[A-Za-z0-9_-]{8,64}$` is reused, and anything else is
replaced with a fresh uuid. The same value is in the error body's `requestId`.

Quote that id when you contact support. It is the key the server logs are
written under: `http` lines carry `requestId`, `method`, `path`, `status`, and
`durationMs`, and an `internal` error logs the exception against the same id.

## Retrying

| status | do |
|--------|-----|
| `400`, `403`, `404`, `422` | fix the request. Retrying it unchanged fails again |
| `409` | read the current state, then decide: it usually means your view is stale |
| `429` | wait `details.retryAfter`, then send it once |
| `500` | retry with backoff, and report the `requestId` if it keeps happening |

Two calls are safe to repeat, so a lost answer costs nothing: completing a match
that is already `completed` returns it, and a `…/enter` for a player who is
already registered keeps that registration and only issues a fresh session.

Everything else that changes state is not. `POST …/matches` twice makes two
matches, `POST …/sessions` twice makes two sessions with two tokens, and a second
score for a session keeps the first number and only merges the new flags in: see
[Scores](/docs/scores).

A `500` never leaks internals: the message is the fixed `internal error`, and no
stack trace or dependency text is put in the response.
