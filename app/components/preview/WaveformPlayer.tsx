import { useRef } from "react";
import { useWaveSurfer } from "~/hooks/useWaveSurfer";
import { formatTime } from "~/lib/audio-utils";

interface PlayingFile {
  path: string;
  name: string;
  objectUrl: string;
}

interface WaveformPlayerProps {
  playingFile: PlayingFile | null;
  onStop: () => void;
}

export function WaveformPlayer({ playingFile, onStop }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { isPlaying, isReady, duration, currentTime, togglePlayPause, stop } =
    useWaveSurfer({
      containerRef,
      audioUrl: playingFile?.objectUrl ?? null,
      onFinish: onStop,
    });

  if (!playingFile) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500 border-b border-gray-800">
        Select an audio file to preview
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm truncate flex-1 mr-4">{playingFile.name}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            disabled={!isReady}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              stop();
              onStop();
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
      <div ref={containerRef} className="w-full mb-2" />
      <div className="text-xs text-gray-500">
        {isReady ? (
          <>
            {formatTime(currentTime)} / {formatTime(duration)}
          </>
        ) : (
          "Loading..."
        )}
      </div>
    </div>
  );
}
