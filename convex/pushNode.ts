"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

/**
 * Convex Node Action: Dispatches Web Push notifications using VAPID keys.
 * Runs in Node environment to support web-push cryptography.
 */
export const sendPushNotification = internalAction({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
    body: v.string(),
    tag: v.string(),
    url: v.string(),
    priority: v.optional(v.union(v.literal("normal"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@stagesignal.app";

    if (!publicKey || !privateKey) {
      // VAPID keys not configured in Convex environment — quiet skip without throwing
      return {
        sent: 0,
        skipped: true,
        reason: "VAPID_KEYS_NOT_CONFIGURED",
      };
    }

    // 1. Fetch active push subscriptions for this room
    const subscriptions = await ctx.runQuery(
      internal.push.listRoomPushSubscriptions,
      { roomId: args.roomId }
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, skipped: true, reason: "NO_ACTIVE_SUBSCRIPTIONS" };
    }

    // 2. Configure web-push
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      tag: args.tag,
      url: args.url,
      priority: args.priority ?? "normal",
      timestamp: Date.now(),
    });

    const deadEndpoints: string[] = [];
    let successCount = 0;
    let failCount = 0;

    // 3. Dispatch to all registered FOH subscriptions
    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payload, {
          urgency: args.priority === "urgent" ? "high" : "normal",
          TTL: args.priority === "urgent" ? 3600 : 900,
        });
        successCount++;
      } catch (err: any) {
        failCount++;
        const statusCode = err?.statusCode || err?.status;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or revoked by device
          deadEndpoints.push(sub.endpoint);
        }
      }
    }

    // 4. Clean up any invalid or expired subscriptions
    if (deadEndpoints.length > 0) {
      await ctx.runMutation(internal.push.removePushEndpoints, {
        endpoints: deadEndpoints,
      });
    }

    return {
      sent: successCount,
      failed: failCount,
      cleaned: deadEndpoints.length,
    };
  },
});

