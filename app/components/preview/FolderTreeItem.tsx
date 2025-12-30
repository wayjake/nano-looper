import type { FileTreeItem } from "~/hooks/useFileSystemAccess";

interface FolderTreeItemProps {
  item: FileTreeItem;
  isFocused: boolean;
  isMarked: boolean;
  isPlaying: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSelect: () => void;
  onToggleMark: () => void;
  onFocus: () => void;
}

export function FolderTreeItem({
  item,
  isFocused,
  isMarked,
  isPlaying,
  isExpanded,
  onToggleExpand,
  onSelect,
  onToggleMark,
  onFocus,
}: FolderTreeItemProps) {
  const paddingLeft = item.depth * 16 + 8;

  const baseClasses =
    "flex items-center gap-2 py-1.5 px-2 rounded text-sm cursor-pointer transition-colors";
  const focusClasses = isFocused
    ? "bg-indigo-900/50 ring-1 ring-indigo-500"
    : "hover:bg-gray-700";
  const playingClasses = isPlaying ? "bg-green-900/30" : "";

  const handleClick = () => {
    onFocus();
    if (item.type === "folder") {
      onToggleExpand?.();
    } else {
      onSelect();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMark();
  };

  return (
    <div
      className={`${baseClasses} ${focusClasses} ${playingClasses}`}
      style={{ paddingLeft }}
      onClick={handleClick}
      data-path={item.path}
    >
      {item.type === "folder" ? (
        <>
          <span className="text-gray-400 w-4 text-center">
            {isExpanded ? "▼" : "▶"}
          </span>
          <span className="text-yellow-500">📁</span>
          <span className="truncate flex-1">{item.name}</span>
        </>
      ) : (
        <>
          <input
            type="checkbox"
            checked={isMarked}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="text-gray-400">♪</span>
          <span className="truncate flex-1">{item.name}</span>
          {isPlaying && (
            <span className="text-green-400 text-xs animate-pulse">▶</span>
          )}
        </>
      )}
    </div>
  );
}
