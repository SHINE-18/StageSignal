/**
 * Client-side cryptographic session utilities for StageSignal.
 *
 * Security Model:
 * 1. Raw 64-character tokens are generated on client devices using Web Crypto.
 * 2. Raw tokens reside strictly in the device's localStorage.
 * 3. Only the SHA-256 hash of the token is ever transmitted to or stored in Convex.
 * 4. All localStorage operations are wrapped in try/catch blocks for Safari private browsing resilience.
 */

/**
 * Generates a 64-character lowercase hex string using cryptographically secure random bytes.
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes the SHA-256 hash of a string in the browser, returning a 64-character lowercase hex string.
 */
export async function sha256Hex(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Key prefix for host session storage
const HOST_STORAGE_PREFIX = "stagesignal:host:";

/**
 * Stores the raw host token in localStorage keyed by roomId.
 */
export function saveHostToken(roomId: string, token: string): void {
  if (typeof window === "undefined" || !roomId) return;
  try {
    localStorage.setItem(`${HOST_STORAGE_PREFIX}${roomId}`, token);
  } catch (error) {
    console.warn("Unable to save host token to localStorage (Safari private mode or storage quota):", error);
  }
}

/**
 * Retrieves the raw host token from localStorage for a specific room.
 */
export function getHostToken(roomId: string): string | null {
  if (typeof window === "undefined" || !roomId) return null;
  try {
    const token = localStorage.getItem(`${HOST_STORAGE_PREFIX}${roomId}`);
    return token && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Clears the host token from localStorage for a specific room.
 */
export function clearHostToken(roomId: string): void {
  if (typeof window === "undefined" || !roomId) return;
  try {
    localStorage.removeItem(`${HOST_STORAGE_PREFIX}${roomId}`);
  } catch {
    // Ignore storage deletion errors
  }
}

// Musician participant session storage
const PARTICIPANT_STORAGE_PREFIX = "stagesignal:participant:";
const LAST_PARTICIPANT_KEY = "stagesignal:lastParticipant";

export function saveParticipantToken(participantId: string, token: string): void {
  if (typeof window === "undefined" || !participantId) return;
  try {
    localStorage.setItem(`${PARTICIPANT_STORAGE_PREFIX}${participantId}`, token);
    localStorage.setItem(LAST_PARTICIPANT_KEY, participantId);
  } catch (error) {
    console.warn("Unable to save participant token to localStorage:", error);
  }
}

export function getParticipantToken(participantId: string): string | null {
  if (typeof window === "undefined" || !participantId) return null;
  try {
    const token = localStorage.getItem(`${PARTICIPANT_STORAGE_PREFIX}${participantId}`);
    return token && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

export function clearParticipantToken(participantId: string): void {
  if (typeof window === "undefined" || !participantId) return;
  try {
    localStorage.removeItem(`${PARTICIPANT_STORAGE_PREFIX}${participantId}`);
  } catch {
    // Ignore storage deletion errors
  }
}

// Musician remembered profile preferences
export interface SavedProfile {
  name: string;
  instrument: string;
}

const PROFILE_KEY = "stagesignal:profile";

export function getSavedProfile(): SavedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfile(profile: SavedProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage save errors
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Ignore storage clear errors
  }
}

export const INSTRUMENTS = [
  "Lead Vocal",
  "Backing Vocal",
  "Acoustic Guitar",
  "Electric Guitar",
  "Bass Guitar",
  "Keyboard",
  "Drums",
  "Other",
] as const;

export type InstrumentType = (typeof INSTRUMENTS)[number];

