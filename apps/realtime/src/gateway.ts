import type { RealtimeErrorCode, RealtimeServerMessage } from "@wasanni/contracts";
import { parseClientMessage } from "./protocol.ts";
import type {
  Gateway,
  GatewayDeps,
  RealtimeSocket,
} from "./types.ts";

const encode = (message: RealtimeServerMessage): string => JSON.stringify(message);

export function createGateway(deps: GatewayDeps): Gateway {
  const sendError = (
    socket: RealtimeSocket,
    code: RealtimeErrorCode,
    message: string,
  ): void => {
    socket.send(encode({ type: "error", code, message, at: Date.now() }));
  };

  return {
    connect(socket, session) {
      const roomSize = deps.rooms.join(session.sessionId, socket);

      socket.send(
        encode({ type: "ready", sessionId: session.sessionId, roomSize, at: Date.now() }),
      );

      deps.logger.info("realtime.connected", {
        sessionId: session.sessionId,
        roomSize,
      });
    },

    async message(socket, raw, session) {
      if (session.expiresAt <= Date.now()) {
        sendError(socket, "score_failed", "the game session has expired");
        deps.bridge.endSession(session.sessionId, {
          type: "session.ended",
          at: Date.now(),
        });
        return;
      }

      const message = parseClientMessage(raw);

      if (message === null) {
        sendError(socket, "bad_message", "the message is not understood");
        return;
      }

      switch (message.type) {
        case "ping":
          socket.send(encode({ type: "pong", at: Date.now() }));
          return;

        case "event":
          deps.bridge.publish(
            session.sessionId,
            {
              type: "peer.event",
              sessionId: session.sessionId,
              data: message.data,
              at: Date.now(),
            },
            socket.id,
          );
          return;

        case "score": {
          const result = await deps.forwardScore.forward({
            sessionId: session.sessionId,
            token: session.token,
            score: message.score,
            endSession: message.endSession === true,
          });

          if (!result.ok) {
            sendError(socket, "score_failed", result.message);
            return;
          }

          socket.send(
            encode({ type: "score.recorded", score: result.score, at: Date.now() }),
          );

          if (message.endSession === true) {
            deps.bridge.endSession(session.sessionId, {
              type: "session.ended",
              at: Date.now(),
            });
          }
          return;
        }
      }
    },

    close(socket, session) {
      const roomSize = deps.rooms.leave(session.sessionId, socket);

      deps.logger.info("realtime.disconnected", { sessionId: session.sessionId, roomSize });
    },
  };
}
