import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertTokenFormat,
  getVerifiedHostRoom,
  sha256Hex,
  timingSafeEqual,
  isParticipantOnline,
} from "./security";

export const heartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!args.participantToken || args.participantToken.length < 32) return false;
      assertTokenFormat(args.participantToken);

      const tokenHash = await sha256Hex(args.participantToken);
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      const participant = participants.find((p) =>
        timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
      );

      if (!participant) return false;

      const now = Date.now();
      // Generous rate limit guard: if heartbeat was updated less than 5s ago, noop return true
      if (now - participant.lastSeenAt < 5_000) {
        return true;
      }

      await ctx.db.patch(participant._id, {
        lastSeenAt: now,
      });
      return true;
    } catch {
      // Heartbeat should never fail loudly on transient mobile connection drops
      return false;
    }
  },
});

export const hostHeartbeat = mutation({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!args.hostToken || args.hostToken.length < 32) return false;
      const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
      if (!room) return false;

      const now = Date.now();
      // Generous rate limit guard: if host heartbeat updated less than 5s ago, noop return true
      if (room.lastHostSeenAt && now - room.lastHostSeenAt < 5_000) {
        return true;
      }

      await ctx.db.patch(room._id, {
        lastHostSeenAt: now,
      });
      return true;
    } catch {
      return false;
    }
  },
});

export const getHostPresenceForMusician = query({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.participantToken || args.participantToken.length < 32) {
      return { lastHostSeenAt: undefined };
    }
    const room = await ctx.db.get(args.roomId);
    if (!room) return { lastHostSeenAt: undefined };

    return {
      lastHostSeenAt: room.lastHostSeenAt,
    };
  },
});

export const getRoomPresence = query({
  args: { roomId: v.id("rooms"), hostToken: v.string() },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      return {
        totalApproved: 0,
        onlineCount: 0,
        offlineCount: 0,
        participants: [],
      };
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const approved = participants.filter((p) => p.status === "approved");
    const evaluated = approved.map((p) => {
      const online = isParticipantOnline(p.lastSeenAt);
      return {
        _id: p._id,
        name: p.name,
        instrument: p.instrument,
        lastSeenAt: p.lastSeenAt,
        isOnline: online,
      };
    });

    return {
      totalApproved: approved.length,
      onlineCount: evaluated.filter((p) => p.isOnline).length,
      offlineCount: evaluated.filter((p) => !p.isOnline).length,
      participants: evaluated,
    };
  },
});
