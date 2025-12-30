import type { RoomState, Sound } from "./types";
import { generateId } from "./uuid";

// Create a new room state with defaults
export function createRoomState(id: string): RoomState {
  return {
    id,
    tempo: 120,
    padMappings: {},
    createdAt: new Date().toISOString(),
    saved: false,
  };
}

// Validate room ID format (UUIDv7)
export function isValidRoomId(roomId: string): boolean {
  // UUIDv7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
  const uuidv7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv7Regex.test(roomId);
}

// TODO: Database operations (to be implemented with actual storage)
export const db = {
  async getRoom(roomId: string): Promise<RoomState | null> {
    // TODO: Implement database lookup
    return null;
  },

  async createRoom(roomId: string): Promise<RoomState> {
    const room = createRoomState(roomId);
    // TODO: Save to database
    return room;
  },

  async updateRoom(
    roomId: string,
    updates: Partial<RoomState>
  ): Promise<RoomState | null> {
    // TODO: Implement database update
    return null;
  },

  async saveRoom(roomId: string): Promise<RoomState | null> {
    return db.updateRoom(roomId, { saved: true });
  },

  async getSounds(roomId: string): Promise<Sound[]> {
    // TODO: Implement database lookup
    return [];
  },

  async getSound(soundId: string): Promise<Sound | null> {
    // TODO: Implement database lookup
    return null;
  },

  async createSound(
    roomId: string,
    file: File
  ): Promise<Sound> {
    const sound: Sound = {
      id: generateId(),
      roomId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    // TODO: Save to storage and database
    return sound;
  },
};
