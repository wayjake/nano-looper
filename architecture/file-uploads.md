# File Uploads via UploadThing Integration

You are Claude Code acting as a senior full-stack engineer integrating UploadThing into an existing Bun + React Router v7 + Drizzle codebase.

Context
- This project is a browser-based DAW with realtime control.
- Audio files (WAV/MP3) must persist on the backend.
- The backend already supports rooms, expiry, and sound metadata.
- We are switching from raw multipart uploads to UploadThing.
- Runtime is Bun.
- Database is Turso/libsql using Drizzle ORM.
- Secrets are provided via environment variables (DO NOT hardcode).

UploadThing requirements
- Use UploadThing for handling file uploads.
- Uploads should support:
  - audio/wav
  - audio/mpeg (mp3)
- Enforce:
  - max file size (e.g. 10–20MB, pick a reasonable default)
  - reasonable per-room upload count
- UploadThing should return a permanent file URL.

Your task
1. Integrate UploadThing server-side with Bun:
   - configure UploadThing using UPLOADTHING_TOKEN from env
   - define a file router for audio uploads
   - validate mime types and size
2. Wire UploadThing into the existing room-based model:
   - uploads must be associated with a roomId
   - roomId must be validated and not expired
3. After successful upload:
   - persist metadata in the database:
     - soundId
     - roomId
     - original filename
     - mime
     - size
     - uploadthing file URL
     - createdAt
   - return sound metadata to the client
4. Update client-side upload flow:
   - use UploadThing client helpers
   - show upload progress
   - handle errors gracefully
5. Ensure uploaded sounds:
   - appear in the room sound list
   - can be fetched by the laptop client for decoding
6. Remove or deprecate old multipart upload endpoints cleanly.

Database considerations
- Update the `sounds` table if needed:
  - replace or supplement disk `path` with `url`
  - ensure existing queries still work
- Add a migration if schema changes are required.

Room lifecycle rules
- Uploads must fail if:
  - room does not exist
  - room is expired and not saved
- Saved rooms retain uploads indefinitely.
- Expired unsaved rooms should have their UploadThing files deleted if supported; otherwise mark orphaned for later cleanup.

Constraints
- Do not expose UPLOADTHING_TOKEN to the client.
- Do not upload PCM or decoded audio—only original files.
- Do not break existing AudioWorklet or realtime logic.
- Keep the API surface minimal.

Output
- UploadThing server configuration
- File router definition
- Updated API wiring
- Client-side upload integration
- Any required schema + migration changes
- Brief explanation of design choices