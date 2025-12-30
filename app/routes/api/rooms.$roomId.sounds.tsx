import type { Route } from "./+types/rooms.$roomId.sounds";
import { getRoom } from "~/db/rooms";
import { getSoundsByRoom } from "~/db/sounds";
import { isValidUUID } from "~/lib/uuid";

// GET /api/rooms/:roomId/sounds - List all sounds in a room
export async function loader({ params }: Route.LoaderArgs) {
  const { roomId } = params;

  // Validate UUID format
  if (!isValidUUID(roomId)) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  // Check room exists
  const room = await getRoom(roomId);
  if (!room) {
    return Response.json({ error: "Room not found or expired" }, { status: 404 });
  }

  // Fetch sounds from database
  const sounds = await getSoundsByRoom(roomId);

  return Response.json({
    sounds: sounds.map((s) => ({
      id: s.id,
      name: s.name,
      mimeType: s.mimeType,
      size: s.size,
      url: s.url,
      createdAt: s.createdAt,
    })),
  });
}
