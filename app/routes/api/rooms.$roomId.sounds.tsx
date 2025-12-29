import type { Route } from "./+types/rooms.$roomId.sounds";

// GET /api/rooms/:roomId/sounds - List all sounds in a room
export async function loader({ params }: Route.LoaderArgs) {
  const { roomId } = params;

  // TODO: Fetch sounds from database
  const sounds: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }> = [];

  return Response.json({ sounds });
}

// POST /api/rooms/:roomId/sounds - Upload a new sound (WAV/MP3)
export async function action({ params, request }: Route.ActionArgs) {
  const { roomId } = params;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["audio/wav", "audio/mpeg", "audio/mp3"];
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: "Invalid file type. Only WAV and MP3 are allowed." },
      { status: 400 }
    );
  }

  // TODO: Save file to storage and create database record
  const soundId = Bun.randomUUIDv7();

  return Response.json({
    id: soundId,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    roomId,
    createdAt: new Date().toISOString(),
  });
}
