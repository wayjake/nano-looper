import type { Route } from "./+types/sounds.$soundId";
import { getSound, deleteSound } from "~/db/sounds";
import { clearPadMappingsForSound } from "~/db/rooms";
import { isValidUUID } from "~/lib/uuid";

// GET /api/sounds/:soundId - Redirect to sound URL
export async function loader({ params }: Route.LoaderArgs) {
  const { soundId } = params;

  if (!isValidUUID(soundId)) {
    return Response.json({ error: "Invalid sound ID" }, { status: 400 });
  }

  const sound = await getSound(soundId);
  if (!sound) {
    return Response.json({ error: "Sound not found" }, { status: 404 });
  }

  if (!sound.url) {
    return Response.json({ error: "Sound URL not available" }, { status: 404 });
  }

  // Redirect to UploadThing URL
  return Response.redirect(sound.url, 302);
}

// DELETE /api/sounds/:soundId - Delete a sound
export async function action({ params, request }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { soundId } = params;

  if (!isValidUUID(soundId)) {
    return Response.json({ error: "Invalid sound ID" }, { status: 400 });
  }

  const sound = await getSound(soundId);
  if (!sound) {
    return Response.json({ error: "Sound not found" }, { status: 404 });
  }

  // Clear any pad mappings referencing this sound
  await clearPadMappingsForSound(soundId);

  // Delete the sound
  await deleteSound(soundId);

  return Response.json({ success: true });
}
