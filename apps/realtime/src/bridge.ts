import type { RealtimeServerMessage } from "@wasanni/contracts";
import { REALTIME_CLOSE } from "@wasanni/contracts";
import type { Logger, Redis } from "@wasanni/kit";
import { REALTIME_CHANNEL } from "./constants.ts";
import type { RoomBridge, RoomRegistry } from "./types.ts";

type Envelope = {
  origin: string;
  room: string;
  message: RealtimeServerMessage;
};

const isEnvelope = (value: unknown): value is Envelope => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<Envelope>;

  return (
    typeof candidate.origin === "string" &&
    typeof candidate.room === "string" &&
    typeof candidate.message === "object" &&
    candidate.message !== null &&
    typeof candidate.message.type === "string"
  );
};

export type BridgeDeps = {
  redis: Redis;
  rooms: RoomRegistry;
  logger: Logger;
  instanceId?: string;
};

export function createRoomBridge(deps: BridgeDeps): RoomBridge {
  const instanceId = deps.instanceId ?? crypto.randomUUID();
  let subscriber: Redis | null = null;

  const deliver = (room: string, message: RealtimeServerMessage): void => {
    if (message.type === "session.ended") {
      deps.rooms.closeRoom(room, message, REALTIME_CLOSE.sessionEnded, "session ended");
      return;
    }

    deps.rooms.broadcast(room, message);
  };

  const publishRemote = (room: string, message: RealtimeServerMessage): void => {
    const envelope: Envelope = { origin: instanceId, room, message };

    deps.redis.publish(REALTIME_CHANNEL, JSON.stringify(envelope)).catch((error: Error) => {
      deps.logger.warn("realtime broadcast failed", { err: error.message, room });
    });
  };

  return {
    publish(room, message, exceptId) {
      deps.rooms.broadcast(room, message, exceptId);
      publishRemote(room, message);
    },

    endSession(room, message) {
      deps.rooms.closeRoom(room, message, REALTIME_CLOSE.sessionEnded, "session ended");
      publishRemote(room, message);
    },

    async start() {
      const client = deps.redis.duplicate();
      subscriber = client;

      client.on("error", (error: Error) => {
        deps.logger.warn("realtime subscriber error", { err: error.message });
      });

      client.on("message", (channel: string, raw: string) => {
        if (channel !== REALTIME_CHANNEL) return;

        let envelope: unknown;

        try {
          envelope = JSON.parse(raw);
        } catch {
          return;
        }

        if (!isEnvelope(envelope) || envelope.origin === instanceId) return;

        deliver(envelope.room, envelope.message);
      });

      await client.subscribe(REALTIME_CHANNEL);

      deps.logger.info("realtime bridge subscribed", { channel: REALTIME_CHANNEL });
    },

    async stop() {
      const client = subscriber;
      if (client === null) return;

      subscriber = null;
      await client.unsubscribe(REALTIME_CHANNEL).catch(() => 0);
      client.disconnect();
    },
  };
}
