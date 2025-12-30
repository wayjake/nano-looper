import type { Route } from "./+types/rooms.$roomId.pads.$padIndex";
import { updatePadMapping } from "~/db/rooms";
import { isValidUUID } from "~/lib/uuid";

// PUT /api/rooms/:roomId/pads/:padIndex - Assign sound to pad
export async function action({ params, request }: Route.ActionArgs) {
  if (request.method !== "PUT") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { roomId, padIndex: padIndexStr } = params;

  // Validate room ID
  if (!isValidUUID(roomId)) {
    return Response.json({ error: "Invalid room ID" }, { status: 400 });
  }

  // Validate pad index
  const padIndex = parseInt(padIndexStr, 10);
  if (isNaN(padIndex) || padIndex < 0 || padIndex > 15) {
    return Response.json({ error: "Invalid pad index (must be 0-15)" }, { status: 400 });
  }

  // Parse request body
  let soundId: string | null;
  try {
    const body = await request.json();
    soundId = body.soundId ?? null;

    // Validate soundId if provided
    if (soundId !== null && !isValidUUID(soundId)) {
      return Response.json({ error: "Invalid sound ID" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Update pad mapping
  const mappings = await updatePadMapping(roomId, padIndex, soundId);
  if (mappings === null) {
    return Response.json({ error: "Room not found or expired" }, { status: 404 });
  }

  return Response.json({ padMappings: mappings });
}
