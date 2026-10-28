import type { RealtimeServerMessage } from "@wasanni/contracts";
import type { RealtimeSocket, RoomRegistry } from "./types.ts";

export function createRoomRegistry(): RoomRegistry {
  const rooms = new Map<string, Map<string, RealtimeSocket>>();

  const closeMembers = (
    room: string,
    message: RealtimeServerMessage | null,
    code: number,
    reason: string,
  ): void => {
    const members = rooms.get(room);
    if (members === undefined) return;

    rooms.delete(room);

    const payload = message === null ? null : JSON.stringify(message);

    for (const socket of members.values()) {
      if (payload !== null) socket.send(payload);
      socket.close(code, reason);
    }
  };

  return {
    join(room, socket) {
      const members = rooms.get(room) ?? new Map<string, RealtimeSocket>();
      rooms.set(room, members);
      members.set(socket.id, socket);
      return members.size;
    },

    leave(room, socket) {
      const members = rooms.get(room);
      if (members === undefined) return 0;

      members.delete(socket.id);
      if (members.size === 0) rooms.delete(room);

      return members.size;
    },

    broadcast(room, message, exceptId) {
      const members = rooms.get(room);
      if (members === undefined) return;

      const payload = JSON.stringify(message);

      for (const socket of members.values()) {
        if (socket.id !== exceptId) socket.send(payload);
      }
    },

    closeRoom(room, message, code, reason) {
      closeMembers(room, message, code, reason);
    },

    closeAll(code, reason) {
      for (const room of [...rooms.keys()]) closeMembers(room, null, code, reason);
    },
  };
}
