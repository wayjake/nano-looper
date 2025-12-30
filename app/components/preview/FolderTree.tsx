import { useState, useEffect, useCallback } from "react";
import type { FileTreeItem } from "~/hooks/useFileSystemAccess";
import { FolderTreeItem } from "./FolderTreeItem";
import { isAudioFile } from "~/lib/audio-utils";

interface FolderTreeProps {
  rootHandle: FileSystemDirectoryHandle | null;
  rootName: string;
  focusedIndex: number;
  playingPath: string | null;
  markedPaths: Set<string>;
  onItemsChange: (items: FileTreeItem[]) => void;
  onSelect: (item: FileTreeItem) => void;
  onToggleMark: (item: FileTreeItem) => void;
  onToggleExpand: (item: FileTreeItem, forceState?: "expand" | "collapse") => void;
  onFocusChange: (index: number) => void;
  expandedPaths: Set<string>;
}

async function readDirectory(
  handle: FileSystemDirectoryHandle,
  basePath: string = ""
): Promise<{ folders: FileTreeItem[]; files: FileTreeItem[] }> {
  const folders: FileTreeItem[] = [];
  const files: FileTreeItem[] = [];
  const depth = basePath ? basePath.split("/").length : 0;

  for await (const entry of handle.values()) {
    const path = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.kind === "directory") {
      folders.push({
        type: "folder",
        name: entry.name,
        path,
        handle: entry,
        depth,
      });
    } else if (isAudioFile(entry.name)) {
      files.push({
        type: "file",
        name: entry.name,
        path,
        handle: entry,
        depth,
      });
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, files };
}

export function FolderTree({
  rootHandle,
  rootName,
  focusedIndex,
  playingPath,
  markedPaths,
  onItemsChange,
  onSelect,
  onToggleMark,
  onToggleExpand,
  onFocusChange,
  expandedPaths,
}: FolderTreeProps) {
  const [flatItems, setFlatItems] = useState<FileTreeItem[]>([]);
  const [folderContents, setFolderContents] = useState<
    Map<string, { folders: FileTreeItem[]; files: FileTreeItem[] }>
  >(new Map());
  const [loading, setLoading] = useState(false);

  // Load root directory contents
  useEffect(() => {
    if (!rootHandle) {
      setFlatItems([]);
      setFolderContents(new Map());
      return;
    }

    async function loadRoot() {
      setLoading(true);
      try {
        const contents = await readDirectory(rootHandle!);
        setFolderContents(new Map([["", contents]]));
      } finally {
        setLoading(false);
      }
    }

    loadRoot();
  }, [rootHandle]);

  // Load folder contents when expanded via keyboard (or any external state change)
  useEffect(() => {
    async function loadExpandedFolders() {
      // Find all expanded folders that don't have contents loaded yet
      const foldersToLoad: FileTreeItem[] = [];

      // We need to find folder items from flatItems or folderContents
      const checkFolder = (items: FileTreeItem[]) => {
        for (const item of items) {
          if (
            item.type === "folder" &&
            expandedPaths.has(item.path) &&
            !folderContents.has(item.path)
          ) {
            foldersToLoad.push(item);
          }
        }
      };

      // Check all known folders from folderContents
      for (const [, contents] of folderContents) {
        checkFolder(contents.folders);
      }

      // Load all missing folder contents
      if (foldersToLoad.length > 0) {
        const newContents = new Map(folderContents);
        for (const folder of foldersToLoad) {
          const contents = await readDirectory(
            folder.handle as FileSystemDirectoryHandle,
            folder.path
          );
          newContents.set(folder.path, contents);
        }
        setFolderContents(newContents);
      }
    }

    loadExpandedFolders();
  }, [expandedPaths, folderContents]);

  // Build flattened list whenever expanded folders or contents change
  useEffect(() => {
    const items: FileTreeItem[] = [];

    function addItems(path: string, depth: number) {
      const contents = folderContents.get(path);
      if (!contents) return;

      for (const folder of contents.folders) {
        items.push(folder);
        if (expandedPaths.has(folder.path)) {
          addItems(folder.path, depth + 1);
        }
      }

      for (const file of contents.files) {
        items.push(file);
      }
    }

    addItems("", 0);
    setFlatItems(items);
    onItemsChange(items);
  }, [folderContents, expandedPaths, onItemsChange]);

  const handleToggleExpand = useCallback(
    async (item: FileTreeItem) => {
      if (item.type !== "folder") return;

      // Load folder contents if expanding and not already loaded
      if (!expandedPaths.has(item.path) && !folderContents.has(item.path)) {
        const contents = await readDirectory(
          item.handle as FileSystemDirectoryHandle,
          item.path
        );
        setFolderContents((prev) => new Map(prev).set(item.path, contents));
      }

      onToggleExpand(item);
    },
    [expandedPaths, folderContents, onToggleExpand]
  );

  if (!rootHandle) {
    return (
      <p className="text-gray-500 text-sm">
        Click "Open Folder" to browse your samples
      </p>
    );
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading...</p>;
  }

  if (flatItems.length === 0) {
    return (
      <p className="text-gray-500 text-sm">No audio files found in folder</p>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="text-xs text-gray-400 mb-2 truncate">{rootName}</div>
      {flatItems.map((item, index) => (
        <FolderTreeItem
          key={item.path}
          item={item}
          isFocused={index === focusedIndex}
          isMarked={markedPaths.has(item.path)}
          isPlaying={item.path === playingPath}
          isExpanded={expandedPaths.has(item.path)}
          onToggleExpand={() => handleToggleExpand(item)}
          onSelect={() => onSelect(item)}
          onToggleMark={() => onToggleMark(item)}
          onFocus={() => onFocusChange(index)}
        />
      ))}
    </div>
  );
}
