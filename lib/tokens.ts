/**
 * Re-export all token & session utilities from lib/session.ts
 * for seamless backward compatibility.
 */
export * from "./session";

// Legacy helper function kept for backwards compatibility if referenced
export function generateRoomCode(): string {
  const prefixes = ["GRACE", "SOUND", "SIGNAL", "STAGE", "PRAISE", "AUDIO", "TEMPO", "SANCT"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${randomPrefix}-${randomNum}`;
}
