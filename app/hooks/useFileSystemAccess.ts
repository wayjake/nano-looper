import { useState, useCallback, useEffect } from "react";
import {
  storeDirectoryHandle,
  getDirectoryHandle,
  clearDirectoryHandle,
} from "~/lib/storage";

export interface FileTreeItem {
  type: "folder" | "file";
  name: string;
  path: string;
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  depth: number;
}

interface UseFileSystemAccessResult {
  rootHandle: FileSystemDirectoryHandle | null;
  rootName: string;
  openFolder: () => Promise<void>;
  isSupported: boolean;
  error: string | null;
  isRestoring: boolean;
}

const STORAGE_KEY = "preview-folder";

export function useFileSystemAccess(): UseFileSystemAccessResult {
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [rootName, setRootName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const isSupported =
    typeof window !== "undefined" && "showDirectoryPicker" in window;

  // Try to restore previous folder on mount
  useEffect(() => {
    if (!isSupported) {
      setIsRestoring(false);
      return;
    }

    async function restoreHandle() {
      try {
        const storedHandle = await getDirectoryHandle(STORAGE_KEY);
        if (storedHandle) {
          // Request permission - user will see a prompt
          const permission = await storedHandle.requestPermission({
            mode: "read",
          });
          if (permission === "granted") {
            setRootHandle(storedHandle);
            setRootName(storedHandle.name);
          } else {
            // Permission denied, clear stored handle
            await clearDirectoryHandle(STORAGE_KEY);
          }
        }
      } catch {
        // Handle doesn't exist or error occurred, clear it
        await clearDirectoryHandle(STORAGE_KEY).catch(() => {});
      } finally {
        setIsRestoring(false);
      }
    }

    restoreHandle();
  }, [isSupported]);

  const openFolder = useCallback(async () => {
    if (!isSupported) {
      setError("File System Access API is not supported in this browser");
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      setRootHandle(handle);
      setRootName(handle.name);
      setError(null);

      // Store the handle for next time
      await storeDirectoryHandle(STORAGE_KEY, handle);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return;
      }
      setError("Failed to open folder");
    }
  }, [isSupported]);

  return { rootHandle, rootName, openFolder, isSupported, error, isRestoring };
}
