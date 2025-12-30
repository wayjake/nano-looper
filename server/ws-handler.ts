import type { ServerWebSocket } from "bun";
import { parseWSMessage, serializeWSMessage, type RoomConnection, type WSMessage } from "../app/lib/ws-types";

// Extended WebSocket data type
export interface WSData {
  roomId: string | null;
  role: "daw" | "controller" | null;
  connectedAt: number;
}

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Track active connections per room for debugging
const roomConnections = new Map<string, Set<ServerWebSocket<WSData>>>();

export const websocketHandler = {
  open(ws: ServerWebSocket<WSData>) {
    ws.data = {
      roomId: null,
      role: null,
      connectedAt: Date.now(),
    };
    console.log("[WS] New connection opened");
  },

  message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
    const msgStr = typeof message === "string" ? message : message.toString();
    const parsed = parseWSMessage(msgStr);

    if (!parsed) {
      ws.send(serializeWSMessage({ type: "error", message: "Invalid message format" }));
      return;
    }

    switch (parsed.type) {
      case "join": {
        const { roomId, role } = parsed;

        // Leave previous room if any
        if (ws.data.roomId) {
          ws.unsubscribe(ws.data.roomId);
          removeFromRoom(ws.data.roomId, ws);
        }

        // Join new room
        ws.data.roomId = roomId;
        ws.data.role = role;
        ws.subscribe(roomId);
        addToRoom(roomId, ws);

        console.log(`[WS] Client joined room ${roomId} as ${role}`);

        // If a controller joined, ask DAW to send current state
        if (role === "controller") {
          ws.publish(roomId, serializeWSMessage({ type: "request-sync" }));
        }
        break;
      }

      case "pad-hit": {
        if (!ws.data.roomId) {
          ws.send(serializeWSMessage({ type: "error", message: "Not joined to a room" }));
          return;
        }

        // Broadcast pad hit to all room participants (including sender for confirmation)
        ws.publish(ws.data.roomId, serializeWSMessage(parsed));
        break;
      }

      case "sync-state": {
        if (!ws.data.roomId) {
          ws.send(serializeWSMessage({ type: "error", message: "Not joined to a room" }));
          return;
        }

        // Only DAW should send sync-state
        if (ws.data.role !== "daw") {
          ws.send(serializeWSMessage({ type: "error", message: "Only DAW can sync state" }));
          return;
        }

        // Broadcast state to all room participants
        ws.publish(ws.data.roomId, serializeWSMessage(parsed));
        break;
      }

      case "tempo-change": {
        if (!ws.data.roomId) {
          ws.send(serializeWSMessage({ type: "error", message: "Not joined to a room" }));
          return;
        }

        // Broadcast tempo change to all room participants
        ws.publish(ws.data.roomId, serializeWSMessage(parsed));
        break;
      }

      case "heartbeat": {
        ws.send(serializeWSMessage({ type: "pong" }));
        break;
      }

      case "pong": {
        // Client responded to our heartbeat, connection is alive
        break;
      }
    }
  },

  close(ws: ServerWebSocket<WSData>) {
    if (ws.data.roomId) {
      ws.unsubscribe(ws.data.roomId);
      removeFromRoom(ws.data.roomId, ws);
      console.log(`[WS] Client left room ${ws.data.roomId}`);
    }
    console.log("[WS] Connection closed");
  },

  error(ws: ServerWebSocket<WSData>, error: Error) {
    console.error("[WS] Error:", error.message);
  },
};

function addToRoom(roomId: string, ws: ServerWebSocket<WSData>) {
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId)!.add(ws);
}

function removeFromRoom(roomId: string, ws: ServerWebSocket<WSData>) {
  const room = roomConnections.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      roomConnections.delete(roomId);
    }
  }
}

// Get connection count for a room (for debugging/monitoring)
export function getRoomConnectionCount(roomId: string): number {
  return roomConnections.get(roomId)?.size ?? 0;
}
