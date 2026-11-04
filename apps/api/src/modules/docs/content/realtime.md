---
title: Realtime
summary: The session websocket: who joins, what travels, and when plain HTTP is enough.
order: 60
---

# Realtime

You do not need the websocket to score. A score sent over it is forwarded to the
same client endpoint, so plain HTTP records exactly the same row with the same
flags. The socket is for a room: players in one session seeing each other, and a
score that broadcasts instead of being polled.

## Connect

`realtimeUrl` from `POST /api/v1/sessions` is the address to open. The same
`sessionToken` and `realtimeUrl` come back from the enter calls: `POST
/api/v1/duels/enter` and `POST /api/v1/tournaments/{tournamentId}/enter`, plus
a 10-character `joinCode` and a `playUrl`: so a duel or tournament player uses
this socket the moment they enter; see `tournaments`.

```
wss://rt.wasanni.test/rt/<sessionId>?token=<sessionToken>
```

The path is `/rt/{sessionId}`. The token is the session token or the session's
join code — the code authenticates exactly like the token — either in the
`token` query parameter or an `authorization: Bearer` header on the handshake.
The handshake is refused before it completes when the token hashes to no session
(`401`), when it belongs to a different session than the path names
(`403 forbidden`), or when that session is `ended` or `expired` (`403 forbidden`).

One socket is one session, and joining puts it in that session's room. Sockets of
the same room are held in memory per instance and fanned out across instances on
the Redis channel `wasanni:realtime`, so two players on different servers still
see each other.

## Messages

Everything is one JSON object per text frame. There is no version field, no
binary frame and no handshake negotiation beyond the token.

From the client:

```json
{ "type": "ping" }
{ "type": "event", "data": { "kind": "goal", "by": "player-2" } }
{ "type": "score", "score": 420 }
{ "type": "score", "score": 420, "endSession": true }
```

From the server:

```json
{ "type": "ready", "sessionId": "01J9…", "roomSize": 2, "at": 1730000000000 }
{ "type": "pong", "at": 1730000000000 }
{ "type": "score.recorded", "score": { …ScoreView… }, "at": 1730000000000 }
{ "type": "peer.event", "sessionId": "01J9…", "data": { "kind": "goal", "by": "player-2" }, "at": 1730000000000 }
{ "type": "session.ended", "at": 1730000000000 }
{ "type": "error", "code": "bad_message", "message": "the message is not understood", "at": 1730000000000 }
```

`ready` arrives as soon as the socket is open and carries the room size at that
moment. `peer.event` is broadcast to every other socket in the room; the sender
does not receive its own event. `score.recorded` carries the stored score view,
including its `flags`, so the client can see that its score was flagged without
a second request.

`code` is `bad_message` for anything that is not one of the three client types
(with a `score` that is not a finite number in range), and `score_failed` when
the forward to the API was refused or unreachable: the message text is the API's
own reason, or "the score could not be recorded" when the API never answered.

Close codes: `1001` when the gateway is shutting down, `4000` when the session
ends.

## Limits

`WS_MAX_MESSAGE_BYTES` (65 536 by default) per frame, and
`WS_IDLE_TIMEOUT_SECONDS` (120) without traffic. The forward to the API has a
5-second budget of its own, so a slow verifier shows up as `score_failed` rather
than a hung socket.

## After expiry

A message sent once the session's `expiresAt` has passed is answered with
`score_failed` ("the game session has expired") and the room is told the session
ended. Reconnect does not help: a new session has to be opened.
