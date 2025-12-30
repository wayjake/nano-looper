import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAudioEngine,
  type AudioEngineState,
  type LoadProgress,
} from "~/lib/audio-engine";

interface SoundInfo {
  id: string;
  url: string | null;
}

interface UseAudioEngineOptions {
  sounds: SoundInfo[];
  enabled?: boolean; // Only initialize on DAW (desktop), not controller
}

interface UseAudioEngineReturn {
  state: AudioEngineState;
  loadProgress: LoadProgress | null;
  trigger: (soundId: string) => void;
  initAudio: () => Promise<void>;
  isReady: boolean;
}

/**
 * React hook for using the AudioEngine
 *
 * Handles:
 * - Initializing audio on user gesture
 * - Preloading sounds when available
 * - Providing trigger function for playback
 */
export function useAudioEngine({
  sounds,
  enabled = true,
}: UseAudioEngineOptions): UseAudioEngineReturn {
  const [state, setState] = useState<AudioEngineState>("uninitialized");
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const initCalledRef = useRef(false);

  const engine = getAudioEngine();

  // Initialize audio engine (must be called from user gesture)
  const initAudio = useCallback(async () => {
    if (!enabled || initCalledRef.current) return;
    initCalledRef.current = true;

    try {
      setState("initializing");
      await engine.init();
      setState("ready");
    } catch (err) {
      console.error("Failed to initialize audio engine:", err);
      setState("error");
      initCalledRef.current = false; // Allow retry
    }
  }, [engine, enabled]);

  // Load sounds when engine is ready and sounds change
  useEffect(() => {
    if (state !== "ready" || !enabled) return;

    const soundsToLoad = sounds
      .filter((s) => s.url && !engine.isSoundLoaded(s.id))
      .map((s) => ({ id: s.id, url: s.url! }));

    if (soundsToLoad.length === 0) return;

    engine.loadSounds(soundsToLoad, setLoadProgress).then(() => {
      setLoadProgress(null);
    });
  }, [state, sounds, engine, enabled]);

  // Trigger a sound
  const trigger = useCallback(
    (soundId: string) => {
      if (!enabled) return;
      engine.trigger(soundId);
    },
    [engine, enabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't dispose the singleton - it may be used by other components
      // Just stop any playing sounds
      if (enabled) {
        engine.stopAll();
      }
    };
  }, [engine, enabled]);

  return {
    state,
    loadProgress,
    trigger,
    initAudio,
    isReady: state === "ready",
  };
}
