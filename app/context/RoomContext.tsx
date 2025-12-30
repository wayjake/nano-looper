import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAudioEngine } from "~/hooks/useAudioEngine";

export interface SoundInfo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

export type PadMappings = Record<string, string>;

export interface RoomState {
  id: string;
  tempo: number;
  padMappings: PadMappings;
  createdAt: string;
  saved: boolean;
}

interface RoomContextValue {
  roomState: RoomState;
  sounds: SoundInfo[];
  padMappings: PadMappings;
  selectedSoundId: string | null;
  tempo: number;
  activePad: number | null;
  isMobile: boolean;
  // Audio state
  audioState: "uninitialized" | "initializing" | "ready" | "error";
  audioReady: boolean;
  loadProgress: { loaded: number; total: number; currentSound: string | null } | null;
  // Actions
  setSounds: React.Dispatch<React.SetStateAction<SoundInfo[]>>;
  setPadMappings: React.Dispatch<React.SetStateAction<PadMappings>>;
  setSelectedSoundId: (id: string | null) => void;
  setTempo: (tempo: number) => void;
  setActivePad: (pad: number | null) => void;
  triggerSound: (soundId: string) => void;
  initAudio: () => Promise<void>;
  refreshSounds: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  initialRoomState: RoomState;
  initialSounds: SoundInfo[];
  children: React.ReactNode;
}

export function RoomProvider({ initialRoomState, initialSounds, children }: RoomProviderProps) {
  const [sounds, setSounds] = useState<SoundInfo[]>(initialSounds);
  const [padMappings, setPadMappings] = useState<PadMappings>(initialRoomState.padMappings);
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);
  const [tempo, setTempo] = useState(initialRoomState.tempo);
  const [activePad, setActivePad] = useState<number | null>(null);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Audio engine
  const { state: audioState, loadProgress, trigger, initAudio, isReady: audioReady } = useAudioEngine({
    sounds: sounds.map((s) => ({ id: s.id, url: s.url })),
    enabled: !isMobile,
  });

  const triggerSound = useCallback(
    (soundId: string) => {
      if (audioReady) {
        trigger(soundId);
      }
    },
    [audioReady, trigger]
  );

  const refreshSounds = useCallback(async () => {
    const res = await fetch(`/api/rooms/${initialRoomState.id}/sounds`);
    if (res.ok) {
      const data = await res.json();
      setSounds(data.sounds);
    }
  }, [initialRoomState.id]);

  const value: RoomContextValue = {
    roomState: initialRoomState,
    sounds,
    padMappings,
    selectedSoundId,
    tempo,
    activePad,
    isMobile,
    audioState,
    audioReady,
    loadProgress,
    setSounds,
    setPadMappings,
    setSelectedSoundId,
    setTempo,
    setActivePad,
    triggerSound,
    initAudio,
    refreshSounds,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
