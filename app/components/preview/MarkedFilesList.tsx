interface MarkedFile {
  path: string;
  name: string;
}

interface MarkedFilesListProps {
  markedFiles: MarkedFile[];
  onUnmark: (path: string) => void;
}

export function MarkedFilesList({
  markedFiles,
  onUnmark,
}: MarkedFilesListProps) {
  if (markedFiles.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">No files marked for import</div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">
        Marked for Import ({markedFiles.length})
      </h3>
      <ul className="space-y-2">
        {markedFiles.map((file) => (
          <li
            key={file.path}
            className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm"
          >
            <span className="truncate flex-1">{file.name}</span>
            <button
              onClick={() => onUnmark(file.path)}
              className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove from import list"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
