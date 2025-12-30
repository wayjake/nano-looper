/**
 * Generate a UUID that works in both Bun and Node.js environments.
 * Uses UUIDv7 when Bun is available, falls back to crypto.randomUUID() otherwise.
 */
export function generateId(): string {
  if (typeof Bun !== "undefined") {
    return Bun.randomUUIDv7();
  }
  // Fallback to crypto.randomUUID() for Node.js
  return crypto.randomUUID();
}

/**
 * Validate that a string is a valid UUID format.
 * Accepts both UUIDv4 and UUIDv7 formats.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}
