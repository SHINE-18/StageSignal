import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    code: v.string(),
    status: v.union(v.literal("active"), v.literal("ended")),
    sessionType: v.union(v.literal("sunday"), v.literal("rehearsal"), v.literal("special")),
    hostTokenHash: v.string(),
    capacity: v.optional(v.number()),
    maxApproved: v.optional(v.number()),
    lastHostSeenAt: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  participants: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    instrument: v.string(),
    participantTokenHash: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("removed")),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_status", ["roomId", "status"]),

  requests: defineTable({
    roomId: v.id("rooms"),
    participantId: v.id("participants"),
    category: v.string(),
    message: v.string(),
    priority: v.union(v.literal("normal"), v.literal("urgent")),
    status: v.union(v.literal("pending"), v.literal("acknowledged"), v.literal("resolved")),
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_participant", ["participantId"])
    .index("by_room_and_status", ["roomId", "status"]),

  requestEvents: defineTable({
    requestId: v.id("requests"),
    roomId: v.id("rooms"),
    action: v.union(v.literal("created"), v.literal("acknowledged"), v.literal("resolved")),
    actorType: v.union(v.literal("musician"), v.literal("host")),
    actorName: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_room", ["roomId"]),

  pushSubscriptions: defineTable({
    roomId: v.id("rooms"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_endpoint", ["endpoint"]),
});
