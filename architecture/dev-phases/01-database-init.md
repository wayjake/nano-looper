# Phase 1: Database Initialization

## Goal
Set up Drizzle ORM with Turso/libsql and define the core schema.

## Tasks

### 1. Install dependencies
```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### 2. Configure environment
Create `.env` with:
- `DATABASE_URL` - Turso database URL
- `DATABASE_AUTH_TOKEN` - Turso auth token

### 3. Create Drizzle config
`drizzle.config.ts` at project root:
- dialect: turso
- schema path: `app/db/schema.ts`
- migrations output: `drizzle/`

### 4. Define schema (`app/db/schema.ts`)

**rooms table:**
- `id` - TEXT PRIMARY KEY (UUIDv7)
- `tempo` - INTEGER DEFAULT 120
- `padMappings` - TEXT (JSON string)
- `saved` - INTEGER (boolean, 0/1)
- `createdAt` - TEXT (ISO timestamp)
- `expiresAt` - TEXT (ISO timestamp, null if saved)

**sounds table:**
- `id` - TEXT PRIMARY KEY (UUIDv7)
- `roomId` - TEXT REFERENCES rooms(id)
- `name` - TEXT (original filename)
- `mimeType` - TEXT
- `size` - INTEGER
- `url` - TEXT (UploadThing URL, nullable until Phase 3)
- `createdAt` - TEXT

**Indexes:**
- `rooms.expiresAt` - for cleanup queries
- `sounds.roomId` - for listing room sounds

### 5. Create database client (`app/db/client.ts`)
- Initialize `@libsql/client` with env vars
- Export drizzle instance
- Handle connection errors gracefully

### 6. Generate and run initial migration
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 7. Add npm scripts
```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

## Verification
- [ ] Can connect to Turso from dev server
- [ ] Schema visible in Drizzle Studio
- [ ] Types generated and importable
