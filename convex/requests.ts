import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  assertTokenFormat,
  getVerifiedHostRoom,
  sha256Hex,
  timingSafeEqual,
} from "./security";

/**
 * PRD Section 5.2 Predefined Request Definitions.
 * Server strictly dictates message text and urgent priority so client cannot spoof.
 */
export const PRESET_DEFINITIONS: Record<
  string,
  { label: string; message: string; priority: "normal" | "urgent" }
> = {
  "more-click": {
    label: "More Click",
    message: "Please increase click in my monitor.",
    priority: "normal",
  },
  "less-click": {
    label: "Less Click",
    message: "Please decrease click in my monitor.",
    priority: "normal",
  },
  "more-me": {
    label: "More Me",
    message: "Please increase my instrument/vocal in my monitor.",
    priority: "normal",
  },
  "less-me": {
    label: "Less Me",
    message: "Please decrease my instrument/vocal in my monitor.",
    priority: "normal",
  },
  "more-bass": {
    label: "More Bass",
    message: "Please increase bass in my monitor.",
    priority: "normal",
  },
  "less-bass": {
    label: "Less Bass",
    message: "Please decrease bass in my monitor.",
    priority: "normal",
  },
  "more-drums": {
    label: "More Drums",
    message: "Please increase drums in my monitor.",
    priority: "normal",
  },
  "less-drums": {
    label: "Less Drums",
    message: "Please decrease drums in my monitor.",
    priority: "normal",
  },
  "more-keys": {
    label: "More Keys",
    message: "Please increase keyboard in my monitor.",
    priority: "normal",
  },
  "less-keys": {
    label: "Less Keys",
    message: "Please decrease keyboard in my monitor.",
    priority: "normal",
  },
  "more-vocal": {
    label: "More Vocal",
    message: "Please increase vocals in my monitor.",
    priority: "normal",
  },
  "less-vocal": {
    label: "Less Vocal",
    message: "Please decrease vocals in my monitor.",
    priority: "normal",
  },
  "cant-hear": {
    label: "Can't Hear",
    message: "Something is missing from my monitor.",
    priority: "normal",
  },
  "sos": {
    label: "SOS",
    message: "I need urgent help from FOH.",
    priority: "urgent",
  },
};

function normalizeCategoryKey(rawCategory: string): string {
  return rawCategory
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/['’]/g, "");
}

export const createRequest = mutation({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
    category: v.string(),
    message: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("normal"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate raw participant token format
    assertTokenFormat(args.participantToken);

    // 2. Validate room status
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new ConvexError("ROOM_NOT_FOUND: Stage room not found.");
    }
    if (room.status === "ended") {
      throw new ConvexError("ROOM_ENDED: This stage session has ended.");
    }
    if (Date.now() > room.expiresAt) {
      throw new ConvexError("ROOM_EXPIRED: This stage room has expired after 12 hours.");
    }

    // 3. Verify participant token server-side and check approved status
    const tokenHash = await sha256Hex(args.participantToken);
    const roomParticipants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const participant = roomParticipants.find((p) =>
      timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
    );

    if (!participant) {
      throw new ConvexError("UNAUTHORIZED: Invalid participant token for this room.");
    }

    if (participant.status !== "approved") {
      throw new ConvexError("NOT_APPROVED: You must be approved by FOH to submit stage requests.");
    }

    // 4. Resolve Category, Server-Controlled Message, and Priority
    const categoryKey = normalizeCategoryKey(args.category);
    const preset = PRESET_DEFINITIONS[categoryKey];

    let finalCategory: string;
    let finalMessage: string;
    let finalPriority: "normal" | "urgent";

    if (preset) {
      finalCategory = preset.label;
      // Server DECIDES the message and priority for presets: client cannot spoof
      finalMessage = preset.message;
      finalPriority = preset.priority;
    } else if (categoryKey === "custom") {
      finalCategory = "Custom";
      finalPriority = "normal"; // Custom requests cannot claim urgent priority
      const customTrimmed = (args.message || "").trim();
      if (!customTrimmed || customTrimmed.length === 0) {
        throw new ConvexError("INVALID_MESSAGE: Custom message cannot be empty.");
      }
      if (customTrimmed.length > 240) {
        throw new ConvexError("INVALID_MESSAGE: Custom message exceeds 240 characters.");
      }
      finalMessage = customTrimmed;
    } else {
      throw new ConvexError("INVALID_CATEGORY: Unrecognized request category.");
    }

    // 5. Rate Limiting: reject flooding (> 5 requests within 10 seconds)
    const now = Date.now();
    const myRecentRequests = await ctx.db
      .query("requests")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    const requestsLast10Sec = myRecentRequests.filter(
      (r) => now - r.createdAt < 10_000
    );
    if (requestsLast10Sec.length >= 5) {
      throw new ConvexError("RATE_LIMITED: You are sending requests too quickly. Please wait a moment.");
    }

    // 6. Anti-Duplicate Guard: drop exact identical pending requests within 15 seconds
    const pendingDuplicate = myRecentRequests.find(
      (r) =>
        r.status === "pending" &&
        r.category === finalCategory &&
        r.message === finalMessage &&
        now - r.createdAt < 15_000
    );
    if (pendingDuplicate) {
      throw new ConvexError("DUPLICATE_REQUEST: This request is already pending in the FOH queue.");
    }

    // 7. Insert the request
    const requestId = await ctx.db.insert("requests", {
      roomId: args.roomId,
      participantId: participant._id,
      category: finalCategory,
      message: finalMessage,
      priority: finalPriority,
      status: "pending",
      createdAt: now,
    });

    // 8. Insert audit event into requestEvents
    await ctx.db.insert("requestEvents", {
      requestId,
      roomId: args.roomId,
      action: "created",
      actorType: "musician",
      actorName: participant.name,
      timestamp: now,
    });

    // 9. Update participant lastSeenAt presence
    await ctx.db.patch(participant._id, {
      lastSeenAt: now,
    });

    // 10. Schedule push notification asynchronously without blocking request creation
    const isSos = finalPriority === "urgent";
    const notificationTitle = isSos
      ? `SOS — ${participant.name} (${participant.instrument})`
      : `${preset ? preset.label : "Stage Request"} — ${participant.name} (${participant.instrument})`;

    try {
      await ctx.scheduler.runAfter(0, internal.pushNode.sendPushNotification, {
        roomId: args.roomId,
        title: notificationTitle,
        body: finalMessage,
        tag: isSos ? `sos-${args.roomId}` : `request-${requestId}`,
        url: `/room/${args.roomId}/foh`,
        priority: finalPriority,
      });
    } catch (schedErr) {
      // Scheduling failure must NEVER block request creation
      console.error("Non-fatal: failed to schedule push notification:", schedErr);
    }

    return { requestId, status: "pending" as const };
  },
});

export const listMyRequests = query({
  args: {
    roomId: v.id("rooms"),
    participantToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.participantToken || args.participantToken.length < 32) return [];

    const tokenHash = await sha256Hex(args.participantToken);
    const roomParticipants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const participant = roomParticipants.find((p) =>
      timingSafeEqual(p.participantTokenHash.toLowerCase(), tokenHash.toLowerCase())
    );

    if (!participant) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();

    // Sort newest first
    return requests
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        _id: r._id,
        category: r.category,
        message: r.message,
        priority: r.priority,
        status: r.status,
        createdAt: r.createdAt,
        acknowledgedAt: r.acknowledgedAt,
        resolvedAt: r.resolvedAt,
      }));
  },
});

export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("requests"),
    hostToken: v.string(),
    status: v.union(v.literal("acknowledged"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    assertTokenFormat(args.hostToken);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Request not found.");

    const room = await getVerifiedHostRoom(ctx, request.roomId, args.hostToken);
    if (!room) {
      throw new ConvexError("Unauthorized: Invalid host token.");
    }
    if (room.status === "ended") {
      throw new ConvexError("ROOM_ENDED: Cannot update requests in an ended room.");
    }
    if (Date.now() > room.expiresAt) {
      throw new ConvexError("ROOM_EXPIRED: Cannot update requests in an expired room.");
    }

    const now = Date.now();
    if (args.status === "acknowledged") {
      await ctx.db.patch(args.requestId, {
        status: "acknowledged",
        acknowledgedAt: request.acknowledgedAt ?? now,
      });
    } else {
      await ctx.db.patch(args.requestId, {
        status: "resolved",
        acknowledgedAt: request.acknowledgedAt ?? now,
        resolvedAt: now,
      });
    }

    // Record audit event
    await ctx.db.insert("requestEvents", {
      requestId: args.requestId,
      roomId: room._id,
      action: args.status,
      actorType: "host",
      timestamp: now,
    });

    return true;
  },
});

export const listRequestsForHost = query({
  args: { roomId: v.id("rooms"), hostToken: v.string() },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const byId = new Map(participants.map((p) => [p._id, p]));

    return requests
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => {
        const p = byId.get(r.participantId);
        return {
          ...r,
          musicianName: p?.name ?? "Unknown musician",
          instrument: p?.instrument ?? "Stage",
        };
      });
  },
});

export const listRoomRequestHistory = query({
  args: { roomId: v.id("rooms"), hostToken: v.string() },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const byId = new Map(participants.map((p) => [p._id, p]));

    return requests
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => {
        const p = byId.get(r.participantId);
        const durationSeconds = r.resolvedAt
          ? Math.round((r.resolvedAt - r.createdAt) / 1000)
          : undefined;

        const ackDurationSeconds = r.acknowledgedAt
          ? Math.round((r.acknowledgedAt - r.createdAt) / 1000)
          : undefined;

        return {
          _id: r._id,
          musicianName: p?.name ?? "Unknown musician",
          instrument: p?.instrument ?? "Stage",
          category: r.category,
          message: r.message,
          priority: r.priority,
          status: r.status,
          createdAt: r.createdAt,
          acknowledgedAt: r.acknowledgedAt,
          resolvedAt: r.resolvedAt,
          durationSeconds,
          ackDurationSeconds,
        };
      });
  },
});
