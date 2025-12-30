import { useState, useCallback } from "react";
import type { Route } from "./+types/room";
import { getRoom } from "~/db/rooms";
import { getSoundsByRoom } from "~/db/sounds";
import { isValidUUID } from "~/lib/uuid";
import { SoundUploader } from "~/components/SoundUploader";
import { SoundList } from "~/components/SoundList";

interface SoundInfo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

type PadMappings = Record<string, string>;

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
  const [padMappings, setPadMappings] = useState<PadMappings>(roomState.padMappings);
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);

  const refreshSounds = useCallback(async () => {
    const res = await fetch(`/api/rooms/${roomState.id}/sounds`);
    if (res.ok) {
      const data = await res.json();
      setSounds(data.sounds);
    }
  }, [roomState.id]);

  const handleDeleteSound = useCallback((soundId: string) => {
    setSounds((prev) => prev.filter((s) => s.id !== soundId));
    // Also clear any pad mappings for this sound
    setPadMappings((prev) => {
      const updated = { ...prev };
      for (const [padIndex, mappedSoundId] of Object.entries(updated)) {
        if (mappedSoundId === soundId) {
          delete updated[padIndex];
        }
      }
      return updated;
    });
  }, []);

  const handlePadClick = useCallback(
    async (padIndex: number) => {
      if (!selectedSoundId) return;

      // Optimistically update UI
      setPadMappings((prev) => ({ ...prev, [padIndex]: selectedSoundId }));
      setSelectedSoundId(null);

      // Persist to server
      await fetch(`/api/rooms/${roomState.id}/pads/${padIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundId: selectedSoundId }),
      });
    },
    [selectedSoundId, roomState.id]
  );

  const handleClearPad = useCallback(
    async (padIndex: number) => {
      // Optimistically update UI
      setPadMappings((prev) => {
        const updated = { ...prev };
        delete updated[padIndex];
        return updated;
      });

      // Persist to server
      await fetch(`/api/rooms/${roomState.id}/pads/${padIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundId: null }),
      });
    },
    [roomState.id]
  );

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
          <DAWView
            roomId={roomState.id}
            sounds={sounds}
            padMappings={padMappings}
            selectedSoundId={selectedSoundId}
            onSelectSound={setSelectedSoundId}
            onDeleteSound={handleDeleteSound}
            onUploadComplete={refreshSounds}
            onPadClick={handlePadClick}
            onClearPad={handleClearPad}
          />
        </div>
        <div className="md:hidden">
          {/* Controller UI - shown on mobile */}
          <ControllerView roomId={roomState.id} padMappings={padMappings} sounds={sounds} />
        </div>
      </main>
    </div>
  );
}

interface DAWViewProps {
  roomId: string;
  sounds: SoundInfo[];
  padMappings: PadMappings;
  selectedSoundId: string | null;
  onSelectSound: (soundId: string | null) => void;
  onDeleteSound: (soundId: string) => void;
  onUploadComplete: () => void;
  onPadClick: (padIndex: number) => void;
  onClearPad: (padIndex: number) => void;
}

function DAWView({
  roomId,
  sounds,
  padMappings,
  selectedSoundId,
  onSelectSound,
  onDeleteSound,
  onUploadComplete,
  onPadClick,
  onClearPad,
}: DAWViewProps) {
  // Helper to get sound name for a pad
  const getSoundName = (padIndex: number): string | null => {
    const soundId = padMappings[padIndex];
    if (!soundId) return null;
    const sound = sounds.find((s) => s.id === soundId);
    return sound?.name ?? null;
  };

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

      {/* Two-column layout: Pads + Sound Library */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pad grid - 4x4 */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">
            Pads {selectedSoundId && <span className="text-indigo-400">(click pad to assign)</span>}
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 16 }).map((_, i) => {
              const soundName = getSoundName(i);
              const hasSound = !!soundName;

              return (
                <div
                  key={i}
                  onClick={() => onPadClick(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (hasSound) onClearPad(i);
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    selectedSoundId
                      ? "ring-2 ring-indigo-500 bg-gray-800 hover:bg-indigo-600"
                      : hasSound
                        ? "bg-indigo-700 hover:bg-indigo-600"
                        : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  title={hasSound ? `${soundName} (right-click to clear)` : "Empty pad"}
                >
                  <span className="text-gray-400 text-xs">{i + 1}</span>
                  {hasSound && (
                    <span className="text-xs text-center px-1 truncate w-full mt-1">
                      {soundName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sound Library sidebar */}
        <div className="space-y-4">
          <SoundUploader roomId={roomId} onUploadComplete={onUploadComplete} />
          <SoundList
            sounds={sounds}
            roomId={roomId}
            selectedSoundId={selectedSoundId}
            onSelectSound={onSelectSound}
            onDeleteSound={onDeleteSound}
          />
        </div>
      </div>
    </div>
  );
}

interface ControllerViewProps {
  roomId: string;
  padMappings: PadMappings;
  sounds: SoundInfo[];
}

function ControllerView({ roomId, padMappings, sounds }: ControllerViewProps) {
  // Helper to check if pad has a sound
  const hasSound = (padIndex: number): boolean => {
    const soundId = padMappings[padIndex];
    return !!soundId && sounds.some((s) => s.id === soundId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Controller</h2>

      {/* Pad grid - 4x4, full width on mobile */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => {
          const padHasSound = hasSound(i);

          return (
            <button
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-colors ${
                padHasSound
                  ? "bg-indigo-700 active:bg-indigo-500 text-white"
                  : "bg-gray-800 active:bg-gray-600 text-gray-500"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
