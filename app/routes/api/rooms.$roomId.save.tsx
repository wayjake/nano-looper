import type { Route } from "./+types/rooms.$roomId.save";
import { getRoom, saveRoom } from "~/db/rooms";
import { isValidUUID } from "~/lib/uuid";

// POST /api/rooms/:roomId/save - Mark room as persistent
export async function action({ params, request }: Route.ActionArgs) {
  const { roomId } = params;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Validate UUID format
  if (!isValidUUID(roomId)) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  // Check if room exists
  const existingRoom = await getRoom(roomId);
  if (!existingRoom) {
    return Response.json({ error: "Room not found or expired" }, { status: 404 });
  }

  // Check if already saved
  if (existingRoom.saved) {
    return Response.json({
      roomId,
      saved: true,
      message: "Room is already saved",
    });
  }

  // Save the room
  const savedRoom = await saveRoom(roomId);
  if (!savedRoom) {
    return Response.json({ error: "Failed to save room" }, { status: 500 });
  }

  return Response.json({
    roomId,
    saved: true,
    savedAt: new Date().toISOString(),
  });
}
