# Phase 2: Room CRUD Operations

## Goal
Implement room creation, loading, and persistence via the existing routes.

## Tasks

### 1. Create room data access layer (`app/db/rooms.ts`)

Functions:
- `createRoom(id: string): Promise<Room>` - Insert new room with 24h expiry
- `getRoom(id: string): Promise<Room | null>` - Fetch room, return null if expired
- `saveRoom(id: string): Promise<Room | null>` - Set `saved=true`, clear `expiresAt`
- `updateRoom(id: string, updates: Partial<Room>): Promise<Room | null>`
- `isRoomExpired(room: Room): boolean` - Check expiry timestamp

### 2. Update home page action (`app/routes/home.tsx`)

```typescript
export async function action() {
  const roomId = Bun.randomUUIDv7();
  await createRoom(roomId);
  return redirect(`/r/${roomId}`);
}
```

### 3. Update room loader (`app/routes/room.tsx`)

```typescript
export async function loader({ params }: Route.LoaderArgs) {
  const room = await getRoom(params.roomId);
  if (!room) {
    throw new Response("Room not found or expired", { status: 404 });
  }
  return { roomState: room };
}
```

### 4. Implement save endpoint (`app/routes/api/rooms.$roomId.save.tsx`)

- Validate room exists and is not already saved
- Call `saveRoom(roomId)`
- Return updated room state or error

### 5. Add room validation helper
- Validate UUIDv7 format before DB queries
- Return 400 for malformed room IDs

### 6. Handle expiry on access
- When loading expired room, return 410 Gone or redirect to home
- Consider showing "Room expired" message

## Verification
- [ ] Creating room from homepage inserts DB record
- [ ] Room page loads room state from DB
- [ ] Invalid/expired room IDs show appropriate error
- [ ] Saving room removes expiry timestamp
