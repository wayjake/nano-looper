# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Looper is a collaborative, browser-based loop music DAW (Digital Audio Workstation). Users create rooms via the homepage, then share the room URL. The laptop acts as the audio authority (renders all audio), while phones/tablets connect as controllers (send pad-trigger events but don't play sound).

## Commands

```bash
bun run dev      # Start dev server with HMR (http://localhost:5173)
bun run build    # Production build
bun run start    # Serve production build
bun run typecheck # Generate route types + TypeScript check
```

**Note**: Always use `bun` instead of `npm` for package management and running scripts.

## Architecture

### Stack
- **Runtime**: Bun (uses Bun APIs like `Bun.randomUUIDv7()`)
- **Framework**: React Router v7 with SSR enabled
- **Styling**: Tailwind CSS v4
- **Database**: Turso/libsql with Drizzle ORM (planned)
- **Realtime**: Bun native WebSockets with pub/sub (planned)

### Route Structure (`app/routes.ts`)
- `/` (home.tsx) - Creates room via POST action, redirects to `/r/:roomId`
- `/r/:roomId` (room.tsx) - Main DAW/controller UI, device-responsive
- `/api/rooms/:roomId/sounds` - List/upload sounds for a room
- `/api/sounds/:soundId` - Stream sound bytes
- `/api/rooms/:roomId/save` - Mark room as persistent (prevents expiry)

### Key Concepts
- **Rooms**: Identified by UUIDv7, expire after 24h unless saved
- **Sounds**: Audio files (WAV/MP3) associated with rooms, stored with metadata
- **Pad Mappings**: 16-pad grid, each pad maps to a sound ID
- **Device Roles**: Desktop shows DAW view, mobile shows controller view (responsive via `md:` breakpoint)

### Path Aliases
- `~/*` maps to `./app/*` (configured in tsconfig.json)

### Types
Core types in `app/lib/types.ts`: `RoomState`, `Sound`, and API response types.

## Architecture Docs

The `architecture/` folder contains task prompts for implementing:
- `websocket.md` - Realtime protocol design
- `audio.md` - AudioWorklet mixer implementation
- `room-expiry.md` - Cleanup and persistence logic
- `device-ux.md` - Controller UI/UX
- `file-uploads.md` - UploadThing integration
- `database.md` - Drizzle schema design

## Git Conventions

- Do not include the Claude Code watermark or `Co-Authored-By` lines in commit messages
