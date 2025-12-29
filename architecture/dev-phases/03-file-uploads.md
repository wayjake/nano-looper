# Phase 3: File Uploads with UploadThing

## Goal
Enable audio file uploads (WAV/MP3) via UploadThing, storing URLs in the database.

## Tasks

### 1. Install UploadThing
```bash
npm install uploadthing @uploadthing/react
```

### 2. Configure environment
Add to `.env`:
- `UPLOADTHING_TOKEN` - UploadThing API token

### 3. Create UploadThing file router (`app/lib/uploadthing.ts`)

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .input(z.object({ roomId: z.string() }))
    .middleware(async ({ input }) => {
      // Validate room exists and not expired
      const room = await getRoom(input.roomId);
      if (!room) throw new Error("Room not found");
      return { roomId: input.roomId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save sound metadata to DB
      const sound = await createSound({
        roomId: metadata.roomId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url: file.url,
      });
      return { soundId: sound.id };
    }),
} satisfies FileRouter;
```

### 4. Create UploadThing API route (`app/routes/api/uploadthing.tsx`)
- Handle GET and POST for UploadThing callbacks
- Use `createRouteHandler` from uploadthing

### 5. Create sound data access layer (`app/db/sounds.ts`)

Functions:
- `createSound(data): Promise<Sound>`
- `getSoundsByRoom(roomId: string): Promise<Sound[]>`
- `getSound(soundId: string): Promise<Sound | null>`
- `deleteSound(soundId: string): Promise<void>`

### 6. Update sounds list endpoint (`app/routes/api/rooms.$roomId.sounds.tsx`)
- Return sounds from DB instead of empty array
- Validate room exists

### 7. Create upload component (`app/components/SoundUploader.tsx`)
- Use `@uploadthing/react` hooks
- Show upload progress
- Handle errors with user feedback
- Pass roomId as input

### 8. Integrate uploader in DAW view
- Replace basic file input with SoundUploader
- Refresh sound list after upload

## Verification
- [ ] Can upload WAV file and see it in sound list
- [ ] Can upload MP3 file and see it in sound list
- [ ] Upload fails gracefully for invalid room
- [ ] Upload progress displays correctly
- [ ] Sound URL is stored in database
