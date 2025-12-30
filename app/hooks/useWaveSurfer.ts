import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";

interface UseWaveSurferOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  audioUrl: string | null;
  onFinish?: () => void;
}

export function useWaveSurfer({
  containerRef,
  audioUrl,
  onFinish,
}: UseWaveSurferOptions) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // Destroy previous instance first to stop any playing audio
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    if (!containerRef.current) return;

    // Clear container and reset state
    containerRef.current.innerHTML = "";
    setIsReady(false);
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);

    if (!audioUrl) {
      return;
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#6366f1",
      progressColor: "#818cf8",
      cursorColor: "#c7d2fe",
      barWidth: 2,
      barRadius: 2,
      height: 80,
      normalize: true,
      backend: "WebAudio",
    });

    ws.load(audioUrl);

    ws.on("ready", () => {
      setDuration(ws.getDuration());
      setIsReady(true);
      ws.play();
    });

    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("seeking", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onFinish?.();
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, onFinish, containerRef]);

  const togglePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const stop = useCallback(() => {
    wavesurferRef.current?.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return { isPlaying, isReady, duration, currentTime, togglePlayPause, stop };
}
