import { useState, useEffect, useRef, useCallback } from "react";
import type { WSMessage, ClientRole } from "~/lib/ws-types";
import { serializeWSMessage, parseWSMessage } from "~/lib/ws-types";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseRoomSocketOptions {
  roomId: string;
  role: ClientRole;
  onPadHit?: (padIndex: number, velocity?: number) => void;
  onSyncState?: (tempo: number, padMappings: Record<string, string>) => void;
  onTempoChange?: (tempo: number) => void;
}

interface UseRoomSocketReturn {
  connectionState: ConnectionState;
  sendPadHit: (padIndex: number, velocity?: number) => void;
  sendSyncState: (tempo: number, padMappings: Record<string, string>) => void;
  sendTempoChange: (tempo: number) => void;
}

// Reconnection config
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL = 25000; // Send heartbeat every 25s (server expects within 30s)

export function useRoomSocket({
  roomId,
  role,
  onPadHit,
  onSyncState,
  onTempoChange,
}: UseRoomSocketOptions): UseRoomSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const messageQueueRef = useRef<WSMessage[]>([]);

  // Get WebSocket URL based on environment
  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined") return null;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;

    // In development, WebSocket server runs on a different port
    const isDev = window.location.port === "5173";
    const port = isDev ? "5174" : window.location.port;

    return `${protocol}//${host}:${port}/ws`;
  }, []);

  // Send a message, queuing if not connected
  const sendMessage = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(serializeWSMessage(msg));
    } else {
      // Queue message for when we reconnect
      messageQueueRef.current.push(msg);
    }
  }, []);

  // Flush queued messages
  const flushMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const msg = messageQueueRef.current.shift()!;
      wsRef.current.send(serializeWSMessage(msg));
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(serializeWSMessage({ type: "heartbeat" }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionState("connecting");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setConnectionState("connected");
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

      // Join the room
      ws.send(serializeWSMessage({ type: "join", roomId, role }));

      // Start heartbeat
      startHeartbeat();

      // Flush any queued messages
      flushMessageQueue();
    };

    ws.onmessage = (event) => {
      const msg = parseWSMessage(event.data);
      if (!msg) return;

      switch (msg.type) {
        case "pad-hit":
          onPadHit?.(msg.padIndex, msg.velocity);
          break;
        case "sync-state":
          onSyncState?.(msg.tempo, msg.padMappings);
          break;
        case "tempo-change":
          onTempoChange?.(msg.tempo);
          break;
        case "pong":
          // Heartbeat response received
          break;
        case "error":
          console.error("[WS] Server error:", msg.message);
          break;
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      stopHeartbeat();
      setConnectionState("disconnected");

      // Schedule reconnection with exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionState("reconnecting");
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelayRef.current);
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }, [getWsUrl, roomId, role, onPadHit, onSyncState, onTempoChange, startHeartbeat, stopHeartbeat, flushMessageQueue]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, stopHeartbeat]);

  // Public API
  const sendPadHit = useCallback(
    (padIndex: number, velocity?: number) => {
      sendMessage({ type: "pad-hit", padIndex, velocity });
    },
    [sendMessage]
  );

  const sendSyncState = useCallback(
    (tempo: number, padMappings: Record<string, string>) => {
      sendMessage({ type: "sync-state", tempo, padMappings });
    },
    [sendMessage]
  );

  const sendTempoChange = useCallback(
    (tempo: number) => {
      sendMessage({ type: "tempo-change", tempo });
    },
    [sendMessage]
  );

  return {
    connectionState,
    sendPadHit,
    sendSyncState,
    sendTempoChange,
  };
}
