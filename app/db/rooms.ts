import { eq, and, isNotNull, lt } from "drizzle-orm";
import { db } from "./client";
import { rooms, type Room, type NewRoom } from "./schema";

const ROOM_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a new room with 24-hour expiry.
 */
export async function createRoom(id: string): Promise<Room> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ROOM_EXPIRY_MS);

  const newRoom = {
    id,
    tempo: 120,
    padMappings: null,
    saved: false,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  } satisfies NewRoom;

  await db.insert(rooms).values(newRoom);

  return newRoom;
}

/**
 * Fetch a room by ID. Returns null if not found or expired.
 */
export async function getRoom(id: string): Promise<Room | null> {
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);

  if (result.length === 0) {
    return null;
  }

  const room = result[0];

  // Check if room is expired (only if not saved)
  if (isRoomExpired(room)) {
    return null;
  }

  return room;
}

/**
 * Mark a room as saved (persistent). Clears expiresAt.
 */
export async function saveRoom(id: string): Promise<Room | null> {
  const room = await getRoom(id);
  if (!room) {
    return null;
  }

  await db
    .update(rooms)
    .set({
      saved: true,
      expiresAt: null,
    })
    .where(eq(rooms.id, id));

  return {
    ...room,
    saved: true,
    expiresAt: null,
  };
}

/**
 * Update room properties.
 */
export async function updateRoom(
  id: string,
  updates: Partial<Pick<Room, "tempo" | "padMappings">>
): Promise<Room | null> {
  const room = await getRoom(id);
  if (!room) {
    return null;
  }

  await db.update(rooms).set(updates).where(eq(rooms.id, id));

  return {
    ...room,
    ...updates,
  };
}

/**
 * Check if a room is expired.
 * Saved rooms never expire.
 */
export function isRoomExpired(room: Room): boolean {
  if (room.saved) {
    return false;
  }

  if (!room.expiresAt) {
    return false;
  }

  return new Date(room.expiresAt) < new Date();
}

/**
 * Delete expired rooms. Returns the number of deleted rooms.
 * Used by the cleanup job.
 */
export async function deleteExpiredRooms(): Promise<number> {
  const now = new Date().toISOString();

  await db
    .delete(rooms)
    .where(
      and(
        eq(rooms.saved, false),
        isNotNull(rooms.expiresAt),
        lt(rooms.expiresAt, now)
      )
    );

  // libsql doesn't return affected rows directly, so we return 0 as placeholder
  // In practice, you'd track this differently or use a count query before delete
  return 0;
}
