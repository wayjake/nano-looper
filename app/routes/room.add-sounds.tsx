import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useRoom } from "~/context/RoomContext";
import { useFileSystemAccess, type FileTreeItem } from "~/hooks/useFileSystemAccess";
import { useKeyboardNavigation } from "~/hooks/useKeyboardNavigation";
import { FolderTree } from "~/components/preview/FolderTree";
import { WaveformPlayer } from "~/components/preview/WaveformPlayer";
import { useUploadThing } from "~/lib/uploadthing-client";

type TabId = "local" | "library";

interface MarkedFile {
  path: string;
  name: string;
  title: string; // Editable title
  handle: FileSystemFileHandle;
}

interface PlayingFile {
  path: string;
  name: string;
  objectUrl: string;
  handle: FileSystemFileHandle;
}

interface UploadingFile {
  path: string;
  title: string;
  status: "pending" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}

export default function AddSounds() {
  const navigate = useNavigate();
  const { roomState, sounds, refreshSounds } = useRoom();

  const [activeTab, setActiveTab] = useState<TabId>("local");
  const [markedFiles, setMarkedFiles] = useState<Map<string, MarkedFile>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // File system access
  const { rootHandle, rootName, openFolder, isSupported, error: fsError, isRestoring } = useFileSystemAccess();

  // Folder tree state
  const [items, setItems] = useState<FileTreeItem[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [playingFile, setPlayingFile] = useState<PlayingFile | null>(null);

  // Cleanup object URL when playing file changes
  const previousUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (previousUrlRef.current && previousUrlRef.current !== playingFile?.objectUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }
    previousUrlRef.current = playingFile?.objectUrl ?? null;

    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, [playingFile?.objectUrl]);

  // UploadThing
  const { startUpload } = useUploadThing("audioUploader", {
    onClientUploadComplete: () => {
      refreshSounds();
    },
    onUploadError: (err) => {
      console.error("Upload error:", err);
    },
  });

  const handleItemsChange = useCallback((newItems: FileTreeItem[]) => {
    setItems(newItems);
  }, []);

  const handleSelect = useCallback(async (item: FileTreeItem) => {
    if (item.type !== "file") return;

    const fileHandle = item.handle as FileSystemFileHandle;
    const file = await fileHandle.getFile();
    const objectUrl = URL.createObjectURL(file);

    setPlayingFile({
      path: item.path,
      name: item.name,
      objectUrl,
      handle: fileHandle,
    });
  }, []);

  const handleStop = useCallback(() => {
    setPlayingFile(null);
  }, []);

  const handleToggleMark = useCallback((item: FileTreeItem) => {
    if (item.type !== "file") return;

    setMarkedFiles((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(item.path)) {
        newMap.delete(item.path);
      } else {
        // Remove file extension for default title
        const title = item.name.replace(/\.(wav|mp3|nmsv)$/i, "");
        newMap.set(item.path, {
          path: item.path,
          name: item.name,
          title,
          handle: item.handle as FileSystemFileHandle,
        });
      }
      return newMap;
    });
  }, []);

  const handleUnmark = useCallback((path: string) => {
    setMarkedFiles((prev) => {
      const newMap = new Map(prev);
      newMap.delete(path);
      return newMap;
    });
  }, []);

  const handleTitleChange = useCallback((path: string, title: string) => {
    setMarkedFiles((prev) => {
      const newMap = new Map(prev);
      const file = newMap.get(path);
      if (file) {
        newMap.set(path, { ...file, title });
      }
      return newMap;
    });
  }, []);

  const handleToggleExpand = useCallback((item: FileTreeItem, forceState?: "expand" | "collapse") => {
    if (item.type !== "folder") return;
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (forceState === "expand") {
        newSet.add(item.path);
      } else if (forceState === "collapse") {
        newSet.delete(item.path);
      } else {
        if (newSet.has(item.path)) {
          newSet.delete(item.path);
        } else {
          newSet.add(item.path);
        }
      }
      return newSet;
    });
  }, []);

  const handleExpand = useCallback(
    (item: FileTreeItem) => handleToggleExpand(item, "expand"),
    [handleToggleExpand]
  );

  const handleCollapse = useCallback(
    (item: FileTreeItem) => handleToggleExpand(item, "collapse"),
    [handleToggleExpand]
  );

  // Keyboard navigation (only when on local tab)
  useKeyboardNavigation({
    items,
    focusedIndex,
    onFocusChange: setFocusedIndex,
    onSelect: handleSelect,
    onToggleMark: handleToggleMark,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    enabled: activeTab === "local" && !!rootHandle,
  });

  // Reset focus when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, focusedIndex]);

  // Upload all marked files
  const handleUpload = useCallback(async () => {
    if (markedFiles.size === 0 || isUploading) return;

    setIsUploading(true);
    const filesToUpload = Array.from(markedFiles.values());

    // Initialize upload status
    const initialStatus = new Map<string, UploadingFile>();
    for (const file of filesToUpload) {
      initialStatus.set(file.path, {
        path: file.path,
        title: file.title,
        status: "pending",
      });
    }
    setUploadingFiles(initialStatus);

    // Upload files one by one (to show progress)
    for (const markedFile of filesToUpload) {
      setUploadingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(markedFile.path, { ...newMap.get(markedFile.path)!, status: "uploading" });
        return newMap;
      });

      try {
        const file = await markedFile.handle.getFile();
        // Create a new file with the custom title as name
        const renamedFile = new File([file], markedFile.title + getExtension(file.name), {
          type: file.type,
        });

        await startUpload([renamedFile], { roomId: roomState.id });

        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.set(markedFile.path, { ...newMap.get(markedFile.path)!, status: "done" });
          return newMap;
        });

        // Remove from marked files after successful upload
        setMarkedFiles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(markedFile.path);
          return newMap;
        });
      } catch (err) {
        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.set(markedFile.path, {
            ...newMap.get(markedFile.path)!,
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
          return newMap;
        });
      }
    }

    setIsUploading(false);
    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles((prev) => {
        const newMap = new Map(prev);
        for (const [path, file] of newMap) {
          if (file.status === "done") {
            newMap.delete(path);
          }
        }
        return newMap;
      });
    }, 2000);
  }, [markedFiles, isUploading, startUpload, roomState.id]);

  const markedPaths = new Set(markedFiles.keys());
  const markedFilesArray = Array.from(markedFiles.values());
  const uploadingFilesArray = Array.from(uploadingFiles.values());

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex flex-col z-50">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Add Sounds</h1>
          <span className="text-sm text-gray-400">
            {markedFiles.size} file{markedFiles.size !== 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="flex items-center gap-3">
          {markedFiles.size > 0 && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                isUploading
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500"
              }`}
            >
              {isUploading ? "Uploading..." : `Upload ${markedFiles.size} File${markedFiles.size !== 1 ? "s" : ""}`}
            </button>
          )}
          <Link
            to={`/r/${roomState.id}`}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
          >
            Close
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 shrink-0">
        <nav className="flex px-4">
          <button
            onClick={() => setActiveTab("local")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "local"
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Local Files
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "library"
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Room Library ({sounds.length})
          </button>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {activeTab === "local" ? (
          <>
            {/* Local files browser */}
            <aside className="w-80 border-r border-gray-800 overflow-y-auto p-4 shrink-0">
              {!isSupported ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    File System Access requires Chrome, Edge, or another Chromium browser.
                  </p>
                </div>
              ) : isRestoring ? (
                <p className="text-gray-500 text-sm">Restoring previous session...</p>
              ) : (
                <>
                  <button
                    onClick={openFolder}
                    className="w-full mb-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
                  >
                    {rootHandle ? "Change Folder" : "Open Folder"}
                  </button>
                  {fsError && (
                    <p className="mb-4 text-sm text-red-400">{fsError}</p>
                  )}
                  <FolderTree
                    rootHandle={rootHandle}
                    rootName={rootName}
                    focusedIndex={focusedIndex}
                    playingPath={playingFile?.path ?? null}
                    markedPaths={markedPaths}
                    expandedPaths={expandedFolders}
                    onItemsChange={handleItemsChange}
                    onSelect={handleSelect}
                    onToggleMark={handleToggleMark}
                    onToggleExpand={handleToggleExpand}
                    onFocusChange={setFocusedIndex}
                  />
                </>
              )}
            </aside>

            {/* Preview & staging area */}
            <section className="flex-1 flex flex-col overflow-hidden">
              <WaveformPlayer playingFile={playingFile} onStop={handleStop} />
              <div className="flex-1 overflow-y-auto p-4">
                <StagingArea
                  markedFiles={markedFilesArray}
                  uploadingFiles={uploadingFilesArray}
                  onUnmark={handleUnmark}
                  onTitleChange={handleTitleChange}
                />
              </div>
            </section>
          </>
        ) : (
          /* Room Library */
          <section className="flex-1 overflow-y-auto p-4">
            <RoomLibrary sounds={sounds} />
          </section>
        )}
      </main>

      {/* Footer with keyboard shortcuts (only for local tab) */}
      {activeTab === "local" && rootHandle && (
        <footer className="p-2 border-t border-gray-800 text-xs text-gray-500 flex justify-center gap-4 shrink-0">
          <span>
            <kbd className="px-1 bg-gray-800 rounded">↑↓</kbd> or{" "}
            <kbd className="px-1 bg-gray-800 rounded">jk</kbd> navigate
          </span>
          <span>
            <kbd className="px-1 bg-gray-800 rounded">Space</kbd> preview
          </span>
          <span>
            <kbd className="px-1 bg-gray-800 rounded">Enter</kbd> or{" "}
            <kbd className="px-1 bg-gray-800 rounded">m</kbd> mark
          </span>
          <span>
            <kbd className="px-1 bg-gray-800 rounded">←→</kbd> or{" "}
            <kbd className="px-1 bg-gray-800 rounded">hl</kbd> expand/collapse
          </span>
        </footer>
      )}
    </div>
  );
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

interface StagingAreaProps {
  markedFiles: MarkedFile[];
  uploadingFiles: UploadingFile[];
  onUnmark: (path: string) => void;
  onTitleChange: (path: string, title: string) => void;
}

function StagingArea({ markedFiles, uploadingFiles, onUnmark, onTitleChange }: StagingAreaProps) {
  // Show uploading files first, then marked files
  const hasContent = markedFiles.length > 0 || uploadingFiles.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Mark files to add them to the upload queue</p>
        <p className="text-xs mt-2">Use Enter or M to mark, Space to preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Ready to Upload</h3>

      {/* Currently uploading */}
      {uploadingFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadingFiles.map((file) => (
            <li
              key={file.path}
              className={`flex items-center gap-3 p-3 rounded ${
                file.status === "done"
                  ? "bg-green-900/30"
                  : file.status === "error"
                    ? "bg-red-900/30"
                    : "bg-gray-800"
              }`}
            >
              <span className="flex-1 truncate text-sm">{file.title}</span>
              <span className="text-xs text-gray-400">
                {file.status === "pending" && "Waiting..."}
                {file.status === "uploading" && "Uploading..."}
                {file.status === "done" && "Done!"}
                {file.status === "error" && file.error}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Marked files with editable titles */}
      {markedFiles.length > 0 && (
        <ul className="space-y-2">
          {markedFiles.map((file) => (
            <li key={file.path} className="flex items-center gap-3 p-3 bg-gray-800 rounded">
              <input
                type="text"
                value={file.title}
                onChange={(e) => onTitleChange(file.path, e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Sound title"
              />
              <span className="text-xs text-gray-500 truncate max-w-32">{file.name}</span>
              <button
                onClick={() => onUnmark(file.path)}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RoomLibraryProps {
  sounds: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    url: string | null;
    createdAt: string;
  }>;
}

function RoomLibrary({ sounds }: RoomLibraryProps) {
  if (sounds.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No sounds uploaded yet</p>
        <p className="text-xs mt-2">Switch to Local Files to browse and upload samples</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Uploaded Sounds ({sounds.length})</h3>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sounds.map((sound) => (
          <li
            key={sound.id}
            className="p-3 bg-gray-800 rounded flex items-center justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{sound.name}</p>
              <p className="text-xs text-gray-500">
                {formatFileSize(sound.size)} · {sound.mimeType.split("/")[1]?.toUpperCase()}
              </p>
            </div>
            {sound.url && (
              <a
                href={sound.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Preview
              </a>
            )}
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
