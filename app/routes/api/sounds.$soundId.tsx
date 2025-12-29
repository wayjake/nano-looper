import type { Route } from "./+types/sounds.$soundId";

// GET /api/sounds/:soundId - Stream sound bytes
export async function loader({ params }: Route.LoaderArgs) {
  const { soundId } = params;

  // TODO: Fetch sound metadata from database
  // TODO: Stream sound bytes from storage

  // Placeholder: Return 404 until storage is implemented
  return Response.json({ error: "Sound not found" }, { status: 404 });

  // When implemented, return something like:
  // const soundData = await storage.getSound(soundId);
  // return new Response(soundData.stream, {
  //   headers: {
  //     "Content-Type": soundData.mimeType,
  //     "Content-Length": String(soundData.size),
  //     "Content-Disposition": `inline; filename="${soundData.name}"`,
  //   },
  // });
}
