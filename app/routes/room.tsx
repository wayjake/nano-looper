import { Outlet } from "react-router";
import type { Route } from "./+types/room";
import { getRoom } from "~/db/rooms";
import { getSoundsByRoom } from "~/db/sounds";
import { isValidUUID } from "~/lib/uuid";
import { RoomProvider } from "~/context/RoomContext";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Room ${params.roomId} | Nano Looper` },
    { name: "description", content: "Collaborative loop-based music creation" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { roomId } = params;

  // Validate UUID format
  if (!isValidUUID(roomId)) {
    throw new Response("Invalid room ID", { status: 400 });
  }

  const room = await getRoom(roomId);

  if (!room) {
    throw new Response("Room not found or expired", { status: 404 });
  }

  // Parse padMappings from JSON string
  const padMappings = room.padMappings
    ? (JSON.parse(room.padMappings) as Record<string, string>)
    : {};

  // Fetch sounds for this room
  const sounds = await getSoundsByRoom(roomId);

  return {
    roomState: {
      id: room.id,
      tempo: room.tempo,
      padMappings,
      createdAt: room.createdAt,
      saved: room.saved,
    },
    sounds: sounds.map((s) => ({
      id: s.id,
      name: s.name,
      mimeType: s.mimeType,
      size: s.size,
      url: s.url,
      createdAt: s.createdAt,
    })),
  };
}

export default function RoomLayout({ loaderData }: Route.ComponentProps) {
  const { roomState, sounds } = loaderData;

  return (
    <RoomProvider initialRoomState={roomState} initialSounds={sounds}>
      <Outlet />
    </RoomProvider>
  );
}
