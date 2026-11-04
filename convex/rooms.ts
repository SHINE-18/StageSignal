import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertTokenFormat,
  getVerifiedHostRoom,
  sha256Hex,
} from "./security";

// Curated worship and audio words for human-readable, memorable codes
const CODE_WORDS = [
  "GRACE", "SIGNAL", "TEMPO", "SOUND", "PRAISE",
  "STAGE", "AUDIO", "CHORD", "ALTAR", "FAITH",
  "GLORY", "HYMN", "PSALM", "RISEN", "VOICE",
  "SANCT", "HEAVEN", "SHINE", "MERCY", "CROWN",
] as const;

/**
 * Generates a cryptographically secure room code in format WORD-NNNN (e.g. GRACE-4821)
 */
function generateSecureRoomCode(): string {
  const randomBuffer = new Uint32Array(2);
  crypto.getRandomValues(randomBuffer);
  const word = CODE_WORDS[randomBuffer[0] % CODE_WORDS.length];
  // 4-digit number between 1000 and 9999
  const num = 1000 + (randomBuffer[1] % 9000);
  return `${word}-${num}`;
}

export const createRoom = mutation({
  args: {
    name: v.string(),
    sessionType: v.union(v.literal("sunday"), v.literal("rehearsal"), v.literal("special")),
    capacity: v.optional(v.number()),
    maxApproved: v.optional(v.number()),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate raw host token format (32-256 chars)
    assertTokenFormat(args.hostToken);

    // 2. Validate room name (1-60 trimmed characters)
    const trimmedName = args.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 60) {
      throw new Error("Room name must be between 1 and 60 characters.");
    }

    // 3. Validate and clamp capacity (default 8, range 2 to 24)
    const rawCapacity = args.capacity ?? args.maxApproved ?? 8;
    const capacity = Math.min(Math.max(Math.floor(rawCapacity), 2), 24);

    // 4. Generate cryptographically secure room code with collision check
    let uniqueCode = "";
    const MAX_COLLISION_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
      const candidateCode = generateSecureRoomCode();

      // Check if candidate code is already in use by an active, unexpired room
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", candidateCode))
        .first();

      if (!existing || existing.status === "ended" || existing.expiresAt <= Date.now()) {
        uniqueCode = candidateCode;
        break;
      }
    }

    if (!uniqueCode) {
      throw new Error("Unable to generate a unique room code. Please try again.");
    }

    const now = Date.now();
    const expiresAt = now + 12 * 60 * 60 * 1000; // 12-hour session duration

    // 5. Server hashes the raw token with SHA-256. Raw token is NEVER stored in database.
    const hostTokenHash = await sha256Hex(args.hostToken);

    const roomId = await ctx.db.insert("rooms", {
      name: trimmedName,
      code: uniqueCode,
      status: "active",
      sessionType: args.sessionType,
      hostTokenHash,
      capacity,
      maxApproved: capacity,
      createdAt: now,
      expiresAt,
    });

    return { roomId, code: uniqueCode };
  },
});

export const getRoomByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!normalizedCode || normalizedCode.length < 4) {
      return { state: "not_found" as const, room: null };
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (!room) {
      return { state: "not_found" as const, room: null };
    }

    const isExpired = Date.now() > room.expiresAt;
    const state = room.status === "ended" ? ("ended" as const) : isExpired ? ("expired" as const) : ("active" as const);

    // Return only safe fields — never return hostTokenHash or tokens
    return {
      state,
      room: {
        _id: room._id,
        name: room.name,
        code: room.code,
        sessionType: room.sessionType,
        status: room.status,
        capacity: room.capacity ?? room.maxApproved ?? 8,
        expiresAt: room.expiresAt,
        isExpired,
      },
    };
  },
});

export const getRoomPublicInfo = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const isExpired = Date.now() > room.expiresAt;
    return {
      _id: room._id,
      name: room.name,
      code: room.code,
      sessionType: room.sessionType,
      status: room.status,
      capacity: room.capacity ?? room.maxApproved ?? 8,
      expiresAt: room.expiresAt,
      isExpired,
    };
  },
});

export const getHostRoom = query({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      return null;
    }

    const isExpired = Date.now() > room.expiresAt;

    // Return safe host view — never leak hostTokenHash or raw tokens
    return {
      _id: room._id,
      name: room.name,
      code: room.code,
      sessionType: room.sessionType,
      status: room.status,
      capacity: room.capacity ?? room.maxApproved ?? 8,
      maxApproved: room.maxApproved ?? room.capacity ?? 8,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      endedAt: room.endedAt,
      isExpired,
    };
  },
});

export const endRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      throw new Error("Unauthorized: Invalid host session credentials.");
    }

    // Idempotent: if already ended, return success without re-patching
    if (room.status === "ended") {
      return { success: true, alreadyEnded: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.roomId, {
      status: "ended",
      endedAt: now,
    });

    // Clean up push subscriptions for the ended room
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }

    return { success: true, alreadyEnded: false };
  },
});

export const expireRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return false;

    // Lazy expiry: if expired and not yet marked ended
    if (room.status !== "ended" && Date.now() > room.expiresAt) {
      await ctx.db.patch(args.roomId, {
        status: "ended",
        endedAt: Date.now(),
      });
      const subs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();
      for (const sub of subs) {
        await ctx.db.delete(sub._id);
      }
      return true;
    }
    return false;
  },
});

/**
 * Sweep overdue rooms (for cron or maintenance)
 */
export const sweepOverdueRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeRooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let count = 0;
    for (const room of activeRooms) {
      if (room.expiresAt <= now) {
        await ctx.db.patch(room._id, {
          status: "ended",
          endedAt: now,
        });
        const subs = await ctx.db
          .query("pushSubscriptions")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        for (const sub of subs) {
          await ctx.db.delete(sub._id);
        }
        count++;
      }
    }
    return { swept: count };
  },
});
