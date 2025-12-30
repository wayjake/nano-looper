import type { ConnectionState } from "~/hooks/useRoomSocket";

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = {
    connecting: {
      color: "bg-yellow-500",
      text: "Connecting...",
      pulse: true,
    },
    connected: {
      color: "bg-green-500",
      text: "Connected",
      pulse: false,
    },
    disconnected: {
      color: "bg-red-500",
      text: "Disconnected",
      pulse: false,
    },
    reconnecting: {
      color: "bg-yellow-500",
      text: "Reconnecting...",
      pulse: true,
    },
  }[state];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}`}
      />
      <span className="text-xs text-gray-400">{config.text}</span>
    </div>
  );
}
