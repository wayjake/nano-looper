import { eq } from "drizzle-orm";
import { db } from "./client";
import { sounds, type Sound, type NewSound } from "./schema";
import { generateId } from "~/lib/uuid";

export interface CreateSoundData {
  roomId: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Create a new sound record.
 */
export async function createSound(data: CreateSoundData): Promise<Sound> {
  const now = new Date();

  const newSound = {
    id: generateId(),
    roomId: data.roomId,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    url: data.url,
    createdAt: now.toISOString(),
  } satisfies NewSound;

  await db.insert(sounds).values(newSound);

  return newSound;
}

/**
 * Get all sounds for a room.
 */
export async function getSoundsByRoom(roomId: string): Promise<Sound[]> {
  return db.select().from(sounds).where(eq(sounds.roomId, roomId));
}

/**
 * Get a single sound by ID.
 */
export async function getSound(soundId: string): Promise<Sound | null> {
  const result = await db
    .select()
    .from(sounds)
    .where(eq(sounds.id, soundId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Delete a sound by ID.
 */
export async function deleteSound(soundId: string): Promise<void> {
  await db.delete(sounds).where(eq(sounds.id, soundId));
}
