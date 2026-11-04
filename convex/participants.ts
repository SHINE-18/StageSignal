import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertTokenFormat,
  getVerifiedHostRoom,
  sha256Hex,
  timingSafeEqual,
  isParticipantOnline,
} from "./security";

export const VALID_INSTRUMENTS = [
  "Lead Vocal",
  "Backing Vocal",
  "Bass Guitar",
  "Drums",
  "Keyboard",
  "Electric Guitar",
  "Acoustic Guitar",
  "Other",
] as const;

export type ValidInstrument = (typeof VALID_INSTRUMENTS)[number];

export const requestJoin = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    instrument: v.string(),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate raw participant token format
    assertTokenFormat(args.participantToken);

    // 2. Normalize and validate room code
    const normalizedCode = args.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!normalizedCode || normalizedCode.length < 4) {
      throw new Error("ROOM_NOT_FOUND: Please provide a valid room code.");
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (!room) {
      throw new Error("ROOM_NOT_FOUND: Stage room code not found. Please verify with FOH.");
    }

    if (room.status === "ended") {
      throw new Error("ROOM_ENDED: This stage session has already ended.");
    }

    if (Date.now() > room.expiresAt) {
      throw new Error("ROOM_EXPIRED: This stage room has expired after 12 hours.");
    }

    // 3. Validate name (1-40 trimmed characters)
    const trimmedName = args.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 40) {
      throw new Error("INVALID_NAME: Display name must be between 1 and 40 characters.");
    }

    // 4. Validate instrument
    if (!VALID_INSTRUMENTS.includes(args.instrument as ValidInstrument)) {
      throw new Error("INVALID_INSTRUMENT: Please select a valid stage instrument.");
    }

    // 5. Server-side SHA-256 hash of participant token (never store raw token)
    const tokenHash = await sha256Hex(args.participantToken);

    // 6. Rate limiting: cap joins per room over short window (prevent spam)
    const now = Date.now();
    const recentParticipants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const recentJoinsInLastMinute = recentParticipants.filter(
      (p) => now - p.joinedAt < 60_000
    );
    if (recentJoinsInLastMinute.length > 25) {
      throw new Error("RATE_LIMITED: Stage queue is receiving too many requests. Please wait a moment.");
    }

    // 7. Check if participant already exists in this room with this token
    const existing = recentParticipants.find((p) =>
      timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
    );

    if (existing) {
      // If previously rejected or removed by FOH, deny re-entry with same token
      if (existing.status === "removed" || existing.status === "rejected") {
        throw new Error(
          "ACCESS_DENIED: Your access to this room was rejected or removed by FOH. Please contact the sound engineer."
        );
      }

      // If pending or approved, update display details and lastSeenAt
      await ctx.db.patch(existing._id, {
        name: trimmedName,
        instrument: args.instrument,
        lastSeenAt: now,
      });

      return {
        participantId: existing._id,
        roomId: room._id,
        roomName: room.name,
        status: existing.status,
      };
    }

    // 8. Insert new participant in "pending" status
    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      name: trimmedName,
      instrument: args.instrument,
      participantTokenHash: tokenHash,
      status: "pending",
      joinedAt: now,
      lastSeenAt: now,
    });

    return {
      participantId,
      roomId: room._id,
      roomName: room.name,
      status: "pending" as const,
    };
  },
});

export const listParticipantsForHost = query({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Map to safe host view — never expose participantTokenHash or raw tokens
    return participants.map((p) => ({
      _id: p._id,
      roomId: p.roomId,
      name: p.name,
      instrument: p.instrument,
      status: p.status,
      joinedAt: p.joinedAt,
      lastSeenAt: p.lastSeenAt,
      isOnline: isParticipantOnline(p.lastSeenAt),
    }));
  },
});

export const approveParticipant = mutation({
  args: {
    participantId: v.id("participants"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    assertTokenFormat(args.hostToken);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found.");

    const room = await getVerifiedHostRoom(ctx, participant.roomId, args.hostToken);
    if (!room) {
      throw new Error("Unauthorized: Invalid host token.");
    }

    // Enforce capacity on server
    const all = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", participant.roomId))
      .collect();

    const currentlyApproved = all.filter(
      (p) => p.status === "approved" && p._id !== participant._id
    );
    const maxCapacity = room.capacity ?? room.maxApproved ?? 8;

    if (currentlyApproved.length >= maxCapacity) {
      throw new Error(`ROOM_FULL: Maximum approved musician capacity reached (${maxCapacity}).`);
    }

    await ctx.db.patch(args.participantId, {
      status: "approved",
      lastSeenAt: Date.now(),
    });

    return { success: true };
  },
});

export const rejectParticipant = mutation({
  args: {
    participantId: v.id("participants"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    assertTokenFormat(args.hostToken);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found.");

    const room = await getVerifiedHostRoom(ctx, participant.roomId, args.hostToken);
    if (!room) {
      throw new Error("Unauthorized: Invalid host token.");
    }

    await ctx.db.patch(args.participantId, {
      status: "rejected",
    });

    return { success: true };
  },
});

export const removeParticipant = mutation({
  args: {
    participantId: v.id("participants"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    assertTokenFormat(args.hostToken);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found.");

    const room = await getVerifiedHostRoom(ctx, participant.roomId, args.hostToken);
    if (!room) {
      throw new Error("Unauthorized: Invalid host token.");
    }

    await ctx.db.patch(args.participantId, {
      status: "removed",
    });

    return { success: true };
  },
});

export const getParticipantStatus = query({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    if (!args.participantToken || args.participantToken.length < 32) {
      return {
        state: "invalid_token" as const,
        message: "Invalid session token. Please rejoin.",
      };
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return {
        state: "room_not_found" as const,
        message: "Room not found.",
      };
    }

    const tokenHash = await sha256Hex(args.participantToken);

    // Fast path: if participantId provided, verify it directly
    if (args.participantId) {
      const p = await ctx.db.get(args.participantId);
      if (
        p &&
        p.roomId === args.roomId &&
        timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
      ) {
        return {
          state: "found" as const,
          participantId: p._id,
          name: p.name,
          instrument: p.instrument,
          status: p.status,
          roomName: room.name,
          roomCode: room.code,
          roomStatus: room.status,
          isExpired: Date.now() > room.expiresAt,
        };
      }
    }

    // Search by room index
    const all = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const matched = all.find((p) =>
      timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
    );

    if (!matched) {
      return {
        state: "not_found" as const,
        message: "Participant session not found. Please rejoin.",
      };
    }

    return {
      state: "found" as const,
      participantId: matched._id,
      name: matched.name,
      instrument: matched.instrument,
      status: matched.status,
      roomName: room.name,
      roomCode: room.code,
      roomStatus: room.status,
      isExpired: Date.now() > room.expiresAt,
    };
  },
});

export const getMusicianSession = query({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.participantToken || args.participantToken.length < 32) {
      return { authorized: false, status: "invalid_token" as const };
    }

    const room = await ctx.db.get(args.roomId);
    if (!room || room.status === "ended" || Date.now() > room.expiresAt) {
      return { authorized: false, status: "room_inactive" as const };
    }

    const tokenHash = await sha256Hex(args.participantToken);
    const all = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const matched = all.find((p) =>
      timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
    );

    if (!matched || matched.status !== "approved") {
      return {
        authorized: false,
        status: matched?.status ?? ("not_found" as const),
      };
    }

    return {
      authorized: true,
      participant: {
        _id: matched._id,
        name: matched.name,
        instrument: matched.instrument,
        roomId: room._id,
        roomName: room.name,
        roomCode: room.code,
      },
      lastHostSeenAt: room.lastHostSeenAt,
    };
  },
});

export const updatePresence = mutation({
  args: {
    participantId: v.id("participants"),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    assertTokenFormat(args.participantToken);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return false;

    const tokenHash = await sha256Hex(args.participantToken);
    if (!timingSafeEqual(participant.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())) {
      return false;
    }

    await ctx.db.patch(args.participantId, {
      lastSeenAt: Date.now(),
    });
    return true;
  },
});
