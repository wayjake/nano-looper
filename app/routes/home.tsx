import { redirect, Link } from "react-router";
import type { Route } from "./+types/home";
import { generateId } from "~/lib/uuid";
import { createRoom, listRooms } from "~/db/rooms";
import { getSoundsByRoom } from "~/db/sounds";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nano Looper" },
    { name: "description", content: "A collaborative loop-based music DAW" },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const rooms = await listRooms();

  // Get sound counts for each room
  const roomsWithCounts = await Promise.all(
    rooms.map(async (room) => {
      const sounds = await getSoundsByRoom(room.id);
      const padMappings = room.padMappings ? JSON.parse(room.padMappings) : {};
      const assignedPads = Object.keys(padMappings).length;

      return {
        id: room.id,
        tempo: room.tempo,
        saved: room.saved,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        soundCount: sounds.length,
        assignedPads,
      };
    })
  );

  return { rooms: roomsWithCounts };
}

export async function action({}: Route.ActionArgs) {
  const roomId = generateId();
  await createRoom(roomId);
  return redirect(`/r/${roomId}`);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { rooms } = loaderData;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nano Looper</h1>
          <p className="text-gray-400 mb-8">Collaborative loop-based music creation</p>
          <form method="post">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-medium transition-colors"
            >
              Create New Room
            </button>
          </form>
        </div>

        {/* Rooms list */}
        {rooms.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Rooms</h2>
            <div className="grid gap-3">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/r/${room.id}`}
                  className="block p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-gray-300">
                        {room.id.slice(0, 8)}...
                      </span>
                      {room.saved && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-900 text-green-300 rounded">
                          Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{room.tempo} BPM</span>
                      <span>{room.soundCount} sound{room.soundCount !== 1 ? "s" : ""}</span>
                      <span>{room.assignedPads}/16 pads</span>
                      {!room.saved && room.expiresAt && (
                        <span className="text-yellow-500">
                          {formatTimeRemaining(room.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}
