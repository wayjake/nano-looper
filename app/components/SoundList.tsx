import { useState, useRef } from "react";

interface Sound {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

interface SoundListProps {
  sounds: Sound[];
  roomId: string;
  selectedSoundId: string | null;
  onSelectSound: (soundId: string | null) => void;
  onDeleteSound: (soundId: string) => void;
}

export function SoundList({
  sounds,
  roomId,
  selectedSoundId,
  onSelectSound,
  onDeleteSound,
}: SoundListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = (sound: Sound) => {
    if (playingId === sound.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    audioRef.current?.pause();

    // Create new audio element
    const audio = new Audio(sound.url || `/api/sounds/${sound.id}`);
    audioRef.current = audio;

    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);

    audio.play();
    setPlayingId(sound.id);
  };

  const handleDelete = async (soundId: string) => {
    if (deletingId) return;

    setDeletingId(soundId);
    try {
      const res = await fetch(`/api/sounds/${soundId}`, { method: "DELETE" });
      if (res.ok) {
        onDeleteSound(soundId);
        if (selectedSoundId === soundId) {
          onSelectSound(null);
        }
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (sounds.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Sound Library</h3>
        <p className="text-gray-500 text-sm">No sounds uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-sm font-medium mb-3">Sound Library ({sounds.length})</h3>
      <p className="text-xs text-gray-500 mb-3">Click a sound to select, then click a pad to assign</p>
      <ul className="space-y-2">
        {sounds.map((sound) => (
          <li
            key={sound.id}
            onClick={() => onSelectSound(selectedSoundId === sound.id ? null : sound.id)}
            className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors ${
              selectedSoundId === sound.id
                ? "bg-indigo-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {/* Preview button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(sound);
              }}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                playingId === sound.id
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={playingId === sound.id ? "Stop" : "Preview"}
            >
              {playingId === sound.id ? "■" : "▶"}
            </button>

            {/* Sound name */}
            <span className="truncate flex-1">{sound.name}</span>

            {/* Size */}
            <span className="text-gray-400 text-xs">{formatFileSize(sound.size)}</span>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(sound.id);
              }}
              disabled={deletingId === sound.id}
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 hover:bg-red-600 transition-colors disabled:opacity-50"
              title="Delete"
            >
              {deletingId === sound.id ? "..." : "×"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
