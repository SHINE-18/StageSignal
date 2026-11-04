import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getVerifiedHostRoom, assertRoomActiveAndNotExpired } from "./security";

/**
 * Register a Web Push subscription for the FOH host.
 * Host-only: strictly verified with hostToken server-side.
 */
export const registerPushSubscription = mutation({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify host permission server-side
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      throw new Error("UNAUTHORIZED: Host token invalid or missing.");
    }
    assertRoomActiveAndNotExpired(room);

    // 2. Normalize and validate input
    const endpoint = args.endpoint.trim();
    const p256dh = args.p256dh.trim();
    const auth = args.auth.trim();

    if (!endpoint || !p256dh || !auth) {
      throw new Error("INVALID_SUBSCRIPTION: Missing required push subscription keys.");
    }

    // 3. Upsert by endpoint
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        roomId: args.roomId,
        p256dh,
        auth,
        createdAt: now,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        roomId: args.roomId,
        endpoint,
        p256dh,
        auth,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Unregister a push subscription.
 */
export const unregisterPushSubscription = mutation({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      throw new Error("UNAUTHORIZED: Host token invalid or missing.");
    }

    const matched = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint.trim()))
      .first();

    if (matched && matched.roomId === args.roomId) {
      await ctx.db.delete(matched._id);
    }

    return { success: true };
  },
});

/**
 * Host query to check push alert status for the current room.
 * Scrubbed: NEVER returns endpoints, auth keys, or private payload data.
 */
export const getPushSubscriptionStatus = query({
  args: {
    roomId: v.id("rooms"),
    hostToken: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getVerifiedHostRoom(ctx, args.roomId, args.hostToken);
    if (!room) {
      return { hasActiveSubscription: false, count: 0 };
    }

    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return {
      hasActiveSubscription: subscriptions.length > 0,
      count: subscriptions.length,
    };
  },
});

/**
 * Internal Query: Fetch subscription records for notification dispatcher.
 * Strictly internal to Convex backend functions.
 */
export const listRoomPushSubscriptions = internalQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

/**
 * Internal Mutation: Delete subscriptions that returned 404/410 Gone.
 */
export const removePushEndpoints = internalMutation({
  args: { endpoints: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const endpoint of args.endpoints) {
      const match = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .first();
      if (match) {
        await ctx.db.delete(match._id);
      }
    }
    return { removed: args.endpoints.length };
  },
});

/**
 * Internal Mutation: Clean up all subscriptions when a room ends or expires.
 */
export const cleanupRoomSubscriptions = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }

    return { deleted: subs.length };
  },
});
