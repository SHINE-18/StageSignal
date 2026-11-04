/**
 * Security & cryptographic helpers for Convex runtime.
 * Uses Web Crypto (standard in modern JS/Convex runtimes).
 *
 * Security Model:
 * - Clients send the RAW token as a bearer token over secure transport (HTTPS).
 * - Server hashes the token using sha256Hex and compares against the stored hash in constant time (timingSafeEqual).
 * - Hashes in the database cannot be used as credentials because passing a hash will result in sha256(hash),
 *   which fails verification.
 * - Raw tokens are NEVER stored in the database, returned in queries, or exposed in logs.
 */

/**
 * Computes SHA-256 hash formatted as a 64-character lowercase hex string.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Backward-compatible alias
export const hashToken = sha256Hex;

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates 64-character hex hash format
 */
export function assertHashFormat(hash: string): void {
  if (typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash.trim())) {
    throw new Error("Invalid session token hash format.");
  }
}

/**
 * Validates token string format
 */
export function assertTokenFormat(token: string): void {
  if (typeof token !== "string" || token.length < 32 || token.length > 256) {
    throw new Error("Invalid session token format.");
  }
}

/**
 * Shared helper to assert a room is active and not expired.
 */
export function assertRoomActiveAndNotExpired(room: { status: "active" | "ended"; expiresAt: number }): void {
  if (room.status === "ended") {
    throw new Error("This room has ended.");
  }
  if (Date.now() > room.expiresAt) {
    throw new Error("This room has expired.");
  }
}

/**
 * Host-token verification helper:
 * Takes rawHostToken, computes SHA-256 on the server, verifies against stored hostTokenHash
 * in constant time, and asserts that the room is active and not expired.
 */
export async function verifyHostToken(
  ctx: { db: { get: (id: any) => Promise<any> } },
  roomId: any,
  rawHostToken: string
) {
  assertTokenFormat(rawHostToken);
  const room = await ctx.db.get(roomId);
  if (!room) {
    throw new Error("Room not found.");
  }
  const computedHash = await sha256Hex(rawHostToken);
  if (!timingSafeEqual(computedHash.toLowerCase(), room.hostTokenHash.toLowerCase())) {
    throw new Error("Unauthorized: Invalid host token.");
  }
  assertRoomActiveAndNotExpired(room);
  return room;
}

/**
 * Host verification helper for queries or read-only/status operations:
 * Takes rawHostToken, computes SHA-256 on the server, and verifies against stored hostTokenHash
 * in constant time.
 * Returns null if room not found or token does not match.
 * Does not throw on ended/expired room, allowing host to view their ended room history.
 */
export async function getVerifiedHostRoom(
  ctx: { db: { get: (id: any) => Promise<any> } },
  roomId: any,
  rawHostToken: string
) {
  if (!rawHostToken || typeof rawHostToken !== "string" || rawHostToken.length < 32 || rawHostToken.length > 256) {
    return null;
  }
  const room = await ctx.db.get(roomId);
  if (!room) {
    return null;
  }
  const computedHash = await sha256Hex(rawHostToken);
  if (!timingSafeEqual(computedHash.toLowerCase(), room.hostTokenHash.toLowerCase())) {
    return null;
  }
  return room;
}

/**
 * Verifies a raw participantToken against a participant record's stored hash.
 */
export async function verifyParticipantToken(
  rawParticipantToken: string,
  storedTokenHash: string
): Promise<boolean> {
  if (!rawParticipantToken || typeof rawParticipantToken !== "string" || rawParticipantToken.length < 32 || rawParticipantToken.length > 256) {
    return false;
  }
  const computedHash = await sha256Hex(rawParticipantToken);
  return timingSafeEqual(computedHash.toLowerCase(), storedTokenHash.toLowerCase());
}

// Presence threshold: participant is considered online if seen in the last 75 seconds
export const ONLINE_THRESHOLD_MS = 75_000;

export function isParticipantOnline(lastSeenAt: number): boolean {
  return Date.now() - lastSeenAt < ONLINE_THRESHOLD_MS;
}
