import { useEffect, useCallback } from "react";
import type { FileTreeItem } from "./useFileSystemAccess";

interface UseKeyboardNavigationOptions {
  items: FileTreeItem[];
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  onSelect: (item: FileTreeItem) => void;
  onToggleMark: (item: FileTreeItem) => void;
  onExpand: (item: FileTreeItem) => void;
  onCollapse: (item: FileTreeItem) => void;
  enabled: boolean;
  autoPlayOnNavigate?: boolean;
}

export function useKeyboardNavigation({
  items,
  focusedIndex,
  onFocusChange,
  onSelect,
  onToggleMark,
  onExpand,
  onCollapse,
  enabled,
  autoPlayOnNavigate = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const currentItem = items[focusedIndex];

      switch (e.key) {
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const newIndex = Math.max(0, focusedIndex - 1);
          onFocusChange(newIndex);
          if (autoPlayOnNavigate && items[newIndex]?.type === "file") {
            onSelect(items[newIndex]);
          }
          break;
        }

        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const newIndex = Math.min(items.length - 1, focusedIndex + 1);
          onFocusChange(newIndex);
          if (autoPlayOnNavigate && items[newIndex]?.type === "file") {
            onSelect(items[newIndex]);
          }
          break;
        }

        case "ArrowRight":
        case "l":
          e.preventDefault();
          if (currentItem?.type === "folder") {
            onExpand(currentItem);
          }
          break;

        case "ArrowLeft":
        case "h":
          e.preventDefault();
          if (currentItem?.type === "folder") {
            onCollapse(currentItem);
          }
          break;

        case " ":
          e.preventDefault();
          if (currentItem?.type === "file") {
            onSelect(currentItem);
          }
          break;

        case "Enter":
        case "m":
          e.preventDefault();
          if (currentItem?.type === "file") {
            onToggleMark(currentItem);
          } else if (currentItem?.type === "folder" && e.key === "Enter") {
            // Enter on folder toggles expand
            onExpand(currentItem);
          }
          break;
      }
    },
    [
      enabled,
      items,
      focusedIndex,
      onFocusChange,
      onSelect,
      onToggleMark,
      onExpand,
      onCollapse,
      autoPlayOnNavigate,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !items[focusedIndex]) return;
    const item = document.querySelector(
      `[data-path="${CSS.escape(items[focusedIndex].path)}"]`
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, items]);
}
