import { useState, useCallback, useEffect, useRef } from "react";
import type { Route } from "./+types/preview";
import {
  useFileSystemAccess,
  type FileTreeItem,
} from "~/hooks/useFileSystemAccess";
import { useKeyboardNavigation } from "~/hooks/useKeyboardNavigation";
import { FolderTree } from "~/components/preview/FolderTree";
import { WaveformPlayer } from "~/components/preview/WaveformPlayer";
import { MarkedFilesList } from "~/components/preview/MarkedFilesList";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sample Preview | Nano Looper" },
    { name: "description", content: "Browse and preview local audio samples" },
  ];
}

interface PlayingFile {
  path: string;
  name: string;
  objectUrl: string;
  handle: FileSystemFileHandle;
}

interface MarkedFile {
  path: string;
  name: string;
  handle: FileSystemFileHandle;
}

export default function Preview() {
  const { rootHandle, rootName, openFolder, isSupported, error, isRestoring } =
    useFileSystemAccess();

  const [items, setItems] = useState<FileTreeItem[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [playingFile, setPlayingFile] = useState<PlayingFile | null>(null);
  const [markedFiles, setMarkedFiles] = useState<Map<string, MarkedFile>>(
    new Map()
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([""])
  );

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
        newMap.set(item.path, {
          path: item.path,
          name: item.name,
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

  const handleToggleExpand = useCallback(
    (item: FileTreeItem, forceState?: "expand" | "collapse") => {
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
    },
    []
  );

  const handleExpand = useCallback(
    (item: FileTreeItem) => {
      handleToggleExpand(item, "expand");
    },
    [handleToggleExpand]
  );

  const handleCollapse = useCallback(
    (item: FileTreeItem) => {
      handleToggleExpand(item, "collapse");
    },
    [handleToggleExpand]
  );

  useKeyboardNavigation({
    items,
    focusedIndex,
    onFocusChange: setFocusedIndex,
    onSelect: handleSelect,
    onToggleMark: handleToggleMark,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    enabled: !!rootHandle,
  });

  // Reset focus when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, focusedIndex]);

  if (typeof window !== "undefined" && !isSupported) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Browser Not Supported</h1>
          <p className="text-gray-400">
            Sample Preview requires Chrome, Edge, or another Chromium-based
            browser with File System Access API support.
          </p>
        </div>
      </div>
    );
  }

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Restoring previous session...</p>
      </div>
    );
  }

  const markedPaths = new Set(markedFiles.keys());
  const markedFilesArray = Array.from(markedFiles.values());

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Sample Preview</h1>
          {rootHandle && (
            <span className="text-sm text-gray-400">
              {markedFiles.size} file{markedFiles.size !== 1 ? "s" : ""} marked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openFolder}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
          >
            {rootHandle ? "Change Folder" : "Open Folder"}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-red-900/50 border-b border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-gray-800 overflow-y-auto p-4">
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
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden">
          <WaveformPlayer playingFile={playingFile} onStop={handleStop} />
          <div className="flex-1 overflow-y-auto">
            <MarkedFilesList
              markedFiles={markedFilesArray}
              onUnmark={handleUnmark}
            />
          </div>
        </section>
      </main>

      {rootHandle && (
        <footer className="p-2 border-t border-gray-800 text-xs text-gray-500 flex justify-center gap-4">
          <span>
            <kbd className="px-1 bg-gray-800 rounded">↑↓</kbd> or{" "}
            <kbd className="px-1 bg-gray-800 rounded">jk</kbd> navigate
          </span>
          <span>
            <kbd className="px-1 bg-gray-800 rounded">Space</kbd> play
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
