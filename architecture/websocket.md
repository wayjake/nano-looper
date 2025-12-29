# Realtime WebSocket Protocol Review

You are Claude Code acting as a realtime systems architect.

Context
- Bun native WebSockets are used with ws.subscribe / ws.publish.
- Rooms are identified by roomId.
- Anyone with the link can control.
- Laptop is the audio authority.

Your task
1. Review the current WebSocket message envelope and event types.
2. Ensure:
   - messages are minimal and JSON-stable
   - no audio data is sent over WS
   - server performs basic validation (roomId, event type)
3. Improve timing robustness:
   - verify clock.heartbeat logic
   - ensure controller playAt timestamps are handled safely
4. Add connection lifecycle handling:
   - reconnect behavior
   - controller joining mid-session
   - laptop disconnect/reconnect edge cases
5. Ensure the server never trusts client timing blindly.

Constraints
- Do not add Redis or external infra.
- Single-server Bun pub/sub only.
- Keep it understandable and debuggable.

Output
- Updated server WebSocket handlers
- Updated client-side WS logic if needed
- Short explanation of protocol guarantees and limitations