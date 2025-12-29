import type { Route } from "./+types/room";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Room ${params.roomId} | Nano Looper` },
    { name: "description", content: "Collaborative loop-based music creation" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { roomId } = params;
  // TODO: Load room state from database
  const roomState = {
    id: roomId,
    tempo: 120,
    padMappings: {} as Record<string, string>, // pad index -> sound ID
    createdAt: new Date().toISOString(),
    saved: false,
  };
  return { roomState };
}

export default function Room({ loaderData }: Route.ComponentProps) {
  const { roomState } = loaderData;

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
          <DAWView roomId={roomState.id} />
        </div>
        <div className="md:hidden">
          {/* Controller UI - shown on mobile */}
          <ControllerView roomId={roomState.id} />
        </div>
      </main>
    </div>
  );
}

function DAWView({ roomId }: { roomId: string }) {
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
      <div className="p-4 bg-gray-900 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Upload Sound</h3>
        <input
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg"
          className="text-sm text-gray-400"
        />
      </div>
    </div>
  );
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
