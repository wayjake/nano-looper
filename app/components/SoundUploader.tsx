import { useState, useCallback } from "react";
import { useUploadThing } from "~/lib/uploadthing-client";

interface SoundUploaderProps {
  roomId: string;
  onUploadComplete?: (soundId: string) => void;
}

export function SoundUploader({ roomId, onUploadComplete }: SoundUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading, routeConfig } = useUploadThing("audioUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.serverData?.soundId) {
        onUploadComplete?.(res[0].serverData.soundId);
      }
      setError(null);
    },
    onUploadError: (err) => {
      setError(err.message);
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      await startUpload(Array.from(files), { roomId });

      // Reset input
      e.target.value = "";
    },
    [startUpload, roomId]
  );

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-sm font-medium mb-2">Upload Sound</h3>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="audio/wav,audio/mpeg"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <span
            className={`inline-block px-4 py-2 rounded text-sm ${
              isUploading
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isUploading ? "Uploading..." : "Choose File"}
          </span>
        </label>
        <span className="text-xs text-gray-500">WAV or MP3, max 16MB</span>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
