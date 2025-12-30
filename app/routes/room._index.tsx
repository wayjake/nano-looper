import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useRoom, type SoundInfo, type PadMappings } from "~/context/RoomContext";
import { SoundList } from "~/components/SoundList";
import { ConnectionStatus } from "~/components/ConnectionStatus";
import { useRoomSocket } from "~/hooks/useRoomSocket";

export default function RoomIndex() {
  const {
    roomState,
    sounds,
    padMappings,
    setPadMappings,
    selectedSoundId,
    setSelectedSoundId,
    tempo,
    setTempo,
    activePad,
    setActivePad,
    isMobile,
    audioState,
    audioReady,
    loadProgress,
    triggerSound,
    initAudio,
    refreshSounds,
  } = useRoom();

  const audioInitializedRef = useRef(false);

  // Handle incoming pad hits (for DAW to play audio)
  const handlePadHit = useCallback(
    (padIndex: number) => {
      console.log(`[Room] Pad hit: ${padIndex}`);
      setActivePad(padIndex);
      setTimeout(() => setActivePad(null), 100);

      // Only DAW plays audio - controller just shows visual feedback
      if (isMobile) return;

      const soundId = padMappings[padIndex];
      if (soundId) {
        // Auto-initialize audio on first remote trigger (requires user gesture on DAW first)
        if (!audioInitializedRef.current && audioState === "uninitialized") {
          audioInitializedRef.current = true;
          initAudio();
        }

        if (audioReady) {
          triggerSound(soundId);
        }
      }
    },
    [isMobile, padMappings, audioState, audioReady, triggerSound, initAudio, setActivePad]
  );

  // Handle sync state from DAW (only controllers should apply this)
  const handleSyncState = useCallback(
    (newTempo: number, newPadMappings: Record<string, string>) => {
      // DAW is the source of truth - it should not update from sync-state
      if (isMobile) {
        setTempo(newTempo);
        setPadMappings(newPadMappings);
      }
    },
    [isMobile, setTempo, setPadMappings]
  );

  // Handle tempo changes
  const handleTempoChange = useCallback(
    (newTempo: number) => {
      setTempo(newTempo);
    },
    [setTempo]
  );

  // Handle sync request (when a new controller joins, DAW sends its state)
  const handleRequestSync = useCallback(() => {
    if (!isMobile) {
      // Only DAW responds to sync requests
      sendSyncStateRef.current?.(tempo, padMappings);
    }
  }, [isMobile, tempo, padMappings]);

  // Connect to WebSocket
  const { connectionState, sendPadHit, sendSyncState } = useRoomSocket({
    roomId: roomState.id,
    role: isMobile ? "controller" : "daw",
    onPadHit: handlePadHit,
    onSyncState: handleSyncState,
    onTempoChange: handleTempoChange,
    onRequestSync: handleRequestSync,
  });

  // Store sendSyncState in a ref so handleRequestSync can use it
  const sendSyncStateRef = useRef(sendSyncState);
  sendSyncStateRef.current = sendSyncState;

  // Sync state to controllers when pad mappings or tempo change (DAW only)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Skip the initial render to avoid unnecessary sync
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    // Only DAW broadcasts state changes
    if (!isMobile && connectionState === "connected") {
      sendSyncStateRef.current?.(tempo, padMappings);
    }
  }, [padMappings, tempo, isMobile, connectionState]);

  const handleDeleteSound = useCallback(
    (soundId: string) => {
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
      refreshSounds();
    },
    [setPadMappings, refreshSounds]
  );

  const handlePadClick = useCallback(
    async (padIndex: number) => {
      if (!selectedSoundId) return;

      setPadMappings((prev) => ({ ...prev, [padIndex]: selectedSoundId }));
      setSelectedSoundId(null);

      await fetch(`/api/rooms/${roomState.id}/pads/${padIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundId: selectedSoundId }),
      });
    },
    [selectedSoundId, roomState.id, setPadMappings, setSelectedSoundId]
  );

  const handleClearPad = useCallback(
    async (padIndex: number) => {
      setPadMappings((prev) => {
        const updated = { ...prev };
        delete updated[padIndex];
        return updated;
      });

      await fetch(`/api/rooms/${roomState.id}/pads/${padIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundId: null }),
      });
    },
    [roomState.id, setPadMappings]
  );

  // Handle local pad trigger on DAW
  const handleLocalPadTrigger = useCallback(
    (padIndex: number) => {
      if (selectedSoundId) {
        handlePadClick(padIndex);
        return;
      }

      const soundId = padMappings[padIndex];
      if (soundId) {
        if (!audioInitializedRef.current && audioState === "uninitialized") {
          audioInitializedRef.current = true;
          initAudio();
        }

        if (audioReady) {
          triggerSound(soundId);
        }

        setActivePad(padIndex);
        setTimeout(() => setActivePad(null), 100);
      }
    },
    [selectedSoundId, padMappings, audioState, audioReady, triggerSound, initAudio, handlePadClick, setActivePad]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">Nano Looper</h1>
        <div className="flex items-center gap-4">
          <ConnectionStatus state={connectionState} />
          {/* Audio status - only on desktop */}
          {!isMobile && (
            <>
              {audioState === "uninitialized" && (
                <button
                  onClick={() => {
                    audioInitializedRef.current = true;
                    initAudio();
                  }}
                  className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-500 rounded"
                >
                  Enable Audio
                </button>
              )}
              {audioState === "initializing" && (
                <span className="text-sm text-yellow-400">Initializing...</span>
              )}
              {loadProgress && (
                <span className="text-sm text-gray-400">
                  Loading sounds: {loadProgress.loaded}/{loadProgress.total}
                </span>
              )}
              {audioReady && !loadProgress && (
                <span className="text-sm text-green-400">Audio Ready</span>
              )}
              {audioState === "error" && (
                <span className="text-sm text-red-400">Audio Error</span>
              )}
            </>
          )}
          <span className="text-sm text-gray-400">Room: {roomState.id.slice(0, 8)}...</span>
          <span className="text-sm text-gray-400">{tempo} BPM</span>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <main className="p-4">
        {/* Desktop: DAW view / Mobile: Controller view */}
        <div className="hidden md:block">
          <DAWView
            roomId={roomState.id}
            sounds={sounds}
            padMappings={padMappings}
            selectedSoundId={selectedSoundId}
            activePad={activePad}
            onSelectSound={setSelectedSoundId}
            onDeleteSound={handleDeleteSound}
            onPadClick={handleLocalPadTrigger}
            onClearPad={handleClearPad}
          />
        </div>
        <div className="md:hidden">
          <ControllerView
            padMappings={padMappings}
            sounds={sounds}
            activePad={activePad}
            onPadHit={sendPadHit}
          />
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
  activePad: number | null;
  onSelectSound: (soundId: string | null) => void;
  onDeleteSound: (soundId: string) => void;
  onPadClick: (padIndex: number) => void;
  onClearPad: (padIndex: number) => void;
}

function DAWView({
  roomId,
  sounds,
  padMappings,
  selectedSoundId,
  activePad,
  onSelectSound,
  onDeleteSound,
  onPadClick,
  onClearPad,
}: DAWViewProps) {
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
        <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded">Play</button>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded">Stop</button>
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
              const isActive = activePad === i;

              return (
                <div
                  key={i}
                  onClick={() => onPadClick(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (hasSound) onClearPad(i);
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isActive
                      ? "bg-green-500 scale-95"
                      : selectedSoundId
                        ? "ring-2 ring-indigo-500 bg-gray-800 hover:bg-indigo-600"
                        : hasSound
                          ? "bg-indigo-700 hover:bg-indigo-600"
                          : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  title={hasSound ? `${soundName} (right-click to clear)` : "Empty pad"}
                >
                  <span className="text-gray-400 text-xs">{i + 1}</span>
                  {hasSound && (
                    <span className="text-xs text-center px-1 truncate w-full mt-1">{soundName}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sound Library sidebar */}
        <div className="space-y-4">
          <Link
            to={`/r/${roomId}/add-sounds`}
            className="block w-full p-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-center font-medium transition-colors"
          >
            Add Sounds
          </Link>
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
  padMappings: PadMappings;
  sounds: SoundInfo[];
  activePad: number | null;
  onPadHit: (padIndex: number) => void;
}

function ControllerView({ padMappings, sounds, activePad, onPadHit }: ControllerViewProps) {
  const hasSound = (padIndex: number): boolean => {
    const soundId = padMappings[padIndex];
    return !!soundId && sounds.some((s) => s.id === soundId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Controller</h2>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => {
          const padHasSound = hasSound(i);
          const isActive = activePad === i;

          return (
            <button
              key={i}
              onClick={() => onPadHit(i)}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-all ${
                isActive
                  ? "bg-green-500 scale-95 text-white"
                  : padHasSound
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
