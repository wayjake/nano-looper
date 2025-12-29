import type { Route } from "./+types/rooms.$roomId.save";

// POST /api/rooms/:roomId/save - Mark room as persistent
export async function action({ params, request }: Route.ActionArgs) {
  const { roomId } = params;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // TODO: Update room in database to mark as saved/persistent
  // This prevents the room from being auto-deleted

  return Response.json({
    roomId,
    saved: true,
    savedAt: new Date().toISOString(),
  });
}
