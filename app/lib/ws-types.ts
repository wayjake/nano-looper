// WebSocket message types for real-time communication

export type WSMessage =
  | { type: "join"; roomId: string; role: "daw" | "controller" }
  | { type: "pad-hit"; padIndex: number; velocity?: number }
  | { type: "sync-state"; tempo: number; padMappings: Record<string, string> }
  | { type: "tempo-change"; tempo: number }
  | { type: "heartbeat" }
  | { type: "pong" }
  | { type: "error"; message: string };

export type ClientRole = "daw" | "controller";

export interface RoomConnection {
  roomId: string;
  role: ClientRole;
  connectedAt: number;
}

// Validate incoming WebSocket message
export function parseWSMessage(data: string): WSMessage | null {
  try {
    const msg = JSON.parse(data);

    if (typeof msg !== "object" || !msg.type) {
      return null;
    }

    switch (msg.type) {
      case "join":
        if (typeof msg.roomId === "string" && (msg.role === "daw" || msg.role === "controller")) {
          return { type: "join", roomId: msg.roomId, role: msg.role };
        }
        break;

      case "pad-hit":
        if (typeof msg.padIndex === "number" && msg.padIndex >= 0 && msg.padIndex <= 15) {
          return {
            type: "pad-hit",
            padIndex: msg.padIndex,
            velocity: typeof msg.velocity === "number" ? msg.velocity : undefined,
          };
        }
        break;

      case "sync-state":
        if (typeof msg.tempo === "number" && typeof msg.padMappings === "object") {
          return { type: "sync-state", tempo: msg.tempo, padMappings: msg.padMappings };
        }
        break;

      case "tempo-change":
        if (typeof msg.tempo === "number" && msg.tempo >= 20 && msg.tempo <= 300) {
          return { type: "tempo-change", tempo: msg.tempo };
        }
        break;

      case "heartbeat":
        return { type: "heartbeat" };

      case "pong":
        return { type: "pong" };
    }

    return null;
  } catch {
    return null;
  }
}

// Serialize message for sending
export function serializeWSMessage(msg: WSMessage): string {
  return JSON.stringify(msg);
}
