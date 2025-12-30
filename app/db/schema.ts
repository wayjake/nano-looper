import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(), // UUIDv7
    tempo: integer("tempo").default(120).notNull(),
    padMappings: text("pad_mappings"), // JSON string: Record<number, string | null>
    saved: integer("saved", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at"), // null if saved
  },
  (table) => [index("rooms_expires_at_idx").on(table.expiresAt)]
);

export const sounds = sqliteTable(
  "sounds",
  {
    id: text("id").primaryKey(), // UUIDv7
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // original filename
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    url: text("url"), // UploadThing URL, nullable until Phase 3
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("sounds_room_id_idx").on(table.roomId)]
);

// Type exports for use in application code
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Sound = typeof sounds.$inferSelect;
export type NewSound = typeof sounds.$inferInsert;
