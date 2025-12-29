# Phase 5: WebSocket Infrastructure

## Goal
Establish real-time connection between laptop (DAW) and controller devices using Bun native WebSockets.

## Tasks

### 1. Create WebSocket server (`app/lib/ws-server.ts`)

Using Bun's native WebSocket API:
```typescript
// Message types
type WSMessage =
  | { type: "join"; roomId: string; role: "daw" | "controller" }
  | { type: "pad-hit"; padIndex: number; velocity?: number }
  | { type: "sync-state"; tempo: number; padMappings: Record<string, string> }
  | { type: "heartbeat" };
```

### 2. Integrate WebSocket with Bun server

Modify server entry to handle upgrade:
- Check for WebSocket upgrade request on `/ws`
- Validate roomId query parameter
- Subscribe to room channel via `ws.subscribe(roomId)`

### 3. Implement room-based pub/sub

- On join: subscribe to room topic
- On message: validate and broadcast via `ws.publish(roomId, message)`
- On close: cleanup subscription

### 4. Create client WebSocket hook (`app/hooks/useRoomSocket.ts`)

```typescript
function useRoomSocket(roomId: string, role: "daw" | "controller") {
  // Connect to ws://host/ws?roomId=xxx
  // Send join message
  // Handle incoming messages
  // Reconnect on disconnect
  // Return: sendMessage, connectionState, lastMessage
}
```

### 5. Handle connection lifecycle
- Reconnect with exponential backoff
- Show connection status in UI
- Queue messages during reconnection

### 6. Implement heartbeat
- Server sends heartbeat every 30s
- Client responds to keep connection alive
- Detect stale connections

### 7. Add connection status UI
- Green/yellow/red indicator
- "Connecting...", "Connected", "Reconnecting..."
- Display on both DAW and controller views

## Message Flow

```
Controller                    Server                     DAW (Laptop)
    |                           |                           |
    |-- join(room, controller) ->|                           |
    |                           |<-- join(room, daw) --------|
    |                           |                           |
    |-- pad-hit(3) ------------>|                           |
    |                           |------- pad-hit(3) ------->|
    |                           |                     [play sound]
```

## Verification
- [ ] DAW connects to WebSocket on room load
- [ ] Controller connects to same room
- [ ] Messages broadcast to all room participants
- [ ] Connection status visible in UI
- [ ] Reconnects after disconnect
