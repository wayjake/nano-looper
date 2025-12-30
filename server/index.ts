import { websocketHandler, type WSData } from "./ws-handler";

const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 5174;

// WebSocket-only server
// In development: runs alongside Vite dev server
// In production: can be run as a separate process or integrated later
console.log(`[WS] Starting WebSocket server on port ${WS_PORT}...`);

Bun.serve({
  port: WS_PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { roomId: null, role: null, connectedAt: Date.now() } as WSData,
      });

      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
    }

    return new Response("WebSocket server. Connect to /ws", { status: 200 });
  },
  websocket: websocketHandler,
});

console.log(`[WS] WebSocket server running at ws://localhost:${WS_PORT}/ws`);
