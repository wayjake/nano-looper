import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/room";
import { getRoom } from "~/db/rooms";
import { getSoundsByRoom } from "~/db/sounds";
import { isValidUUID } from "~/lib/uuid";
import { SoundUploader } from "~/components/SoundUploader";

interface SoundInfo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

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

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomState, sounds: initialSounds } = loaderData;
  const [sounds, setSounds] = useState<SoundInfo[]>(initialSounds);

  const handleUploadComplete = useCallback(async () => {
    // Refresh sounds list from server
    const res = await fetch(`/api/rooms/${roomState.id}/sounds`);
    if (res.ok) {
      const data = await res.json();
      setSounds(data.sounds);
    }
  }, [roomState.id]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">Nano Looper</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Room: {roomState.id.slice(0, 8)}...
          </span>
          <span className="text-sm text-gray-400">
            {roomState.tempo} BPM
          </span>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <main className="p-4">
        {/* Desktop: DAW view / Mobile: Controller view */}
        <div className="hidden md:block">
          {/* DAW UI - shown on larger screens */}
          <DAWView roomId={roomState.id} sounds={sounds} onUploadComplete={handleUploadComplete} />
        </div>
        <div className="md:hidden">
          {/* Controller UI - shown on mobile */}
          <ControllerView roomId={roomState.id} />
        </div>
      </main>
    </div>
  );
}

interface DAWViewProps {
  roomId: string;
  sounds: SoundInfo[];
  onUploadComplete: () => void;
}

function DAWView({ roomId, sounds, onUploadComplete }: DAWViewProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">DAW View</h2>

      {/* Transport controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
        <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded">
          Play
        </button>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded">
          Stop
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Tempo:</label>
          <input
            type="number"
            defaultValue={120}
            className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center"
          />
        </div>
      </div>

      {/* Pad grid - 4x4 */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer transition-colors"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Sound upload */}
      <SoundUploader roomId={roomId} onUploadComplete={onUploadComplete} />

      {/* Sounds list */}
      {sounds.length > 0 && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-sm font-medium mb-3">Sounds ({sounds.length})</h3>
          <ul className="space-y-2">
            {sounds.map((sound) => (
              <li
                key={sound.id}
                className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm"
              >
                <span className="truncate flex-1">{sound.name}</span>
                <span className="text-gray-500 text-xs ml-2">
                  {formatFileSize(sound.size)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ControllerView({ roomId }: { roomId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Controller</h2>

      {/* Pad grid - 4x4, full width on mobile */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <button
            key={i}
            className="aspect-square bg-gray-800 active:bg-indigo-600 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-500 transition-colors"
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
