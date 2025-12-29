# Room Expiry, Persistence & Cleanup Audit

You are Claude Code acting as a backend reliability engineer.

Context
- Rooms expire after 24 hours unless saved.
- Expiry is enforced on access and via periodic cleanup.
- Sounds are stored on disk and referenced in DB.
- DB uses Drizzle ORM with migrations.

Your task
1. Review room expiry logic across:
   - HTTP loaders/actions
   - WebSocket connection handling
   - background cleanup job
2. Ensure expired rooms:
   - are fully removed from DB
   - have their files deleted from disk
   - cannot be reconnected to via WS
3. Verify saved rooms:
   - never expire
   - are not cleaned accidentally
4. Add defensive logging around cleanup actions.
5. Confirm indexes support expiry queries efficiently.

Constraints
- No cron; use in-process interval.
- Do not block request handling during cleanup.

Output
- Any schema tweaks
- Cleanup logic improvements
- Confirmation checklist of expiry guarantees