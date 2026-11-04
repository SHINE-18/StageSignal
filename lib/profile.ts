import { generateToken, INSTRUMENTS, type InstrumentType } from "./session";

export interface MusicianProfile {
  name: string;
  instrument: InstrumentType;
}

const PROFILE_STORAGE_KEY = "stagesignal:profile";
const ROOM_TOKEN_PREFIX = "stagesignal:participant:room:";

/**
 * Retrieves the remembered musician profile (name and instrument) from localStorage.
 */
export function getSavedProfile(): MusicianProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.instrument === "string" &&
      INSTRUMENTS.includes(parsed.instrument as InstrumentType)
    ) {
      return {
        name: parsed.name.trim(),
        instrument: parsed.instrument as InstrumentType,
      };
    }
    return null;
  } catch (error) {
    console.warn("Could not read remembered musician profile:", error);
    return null;
  }
}

/**
 * Saves or updates the remembered musician profile in localStorage.
 */
export function saveProfile(profile: MusicianProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        name: profile.name.trim(),
        instrument: profile.instrument,
      })
    );
  } catch (error) {
    console.warn("Could not save musician profile:", error);
  }
}

/**
 * Clears the remembered musician profile from localStorage.
 */
export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear musician profile:", error);
  }
}

/**
 * Retrieves or generates an isolated participant token for a specific room.
 * This guarantees approval and identity never carry across rooms.
 */
export function getOrCreateRoomParticipantToken(roomId: string): string {
  if (typeof window === "undefined" || !roomId) {
    return generateToken();
  }
  try {
    const key = `${ROOM_TOKEN_PREFIX}${roomId}`;
    let token = localStorage.getItem(key);
    if (!token || token.length < 32) {
      token = generateToken();
      localStorage.setItem(key, token);
    }
    return token;
  } catch {
    return generateToken();
  }
}

/**
 * Saves a participant token for a specific room in localStorage.
 */
export function saveRoomParticipantToken(roomId: string, token: string): void {
  if (typeof window === "undefined" || !roomId || !token) return;
  try {
    localStorage.setItem(`${ROOM_TOKEN_PREFIX}${roomId}`, token);
  } catch (error) {
    console.warn("Could not save room participant token:", error);
  }
}

/**
 * Clears the participant token for a specific room.
 */
export function clearRoomParticipantToken(roomId: string): void {
  if (typeof window === "undefined" || !roomId) return;
  try {
    localStorage.removeItem(`${ROOM_TOKEN_PREFIX}${roomId}`);
  } catch {
    // Ignore clear errors
  }
}

