"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { urlBase64ToUint8Array, isStandalonePwa, isIosDevice } from "../lib/push";

export function usePushAlerts({
  roomId,
  hostToken,
}: {
  roomId: Id<"rooms"> | null;
  hostToken: string | null;
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation(api.push.registerPushSubscription);
  const unregisterMutation = useMutation(api.push.unregisterPushSubscription);

  // Check remote subscription count for this host session
  const subscriptionStatus = useQuery(
    api.push.getPushSubscriptionStatus,
    roomId && hostToken ? { roomId, hostToken } : "skip"
  );

  // Initialize environment detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    setIsStandalone(isStandalonePwa());
    setIsIos(isIosDevice());

    if (supported) {
      setPermission(Notification.permission);
      // Check if registration already exists
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }).catch(() => {
        // Quiet catch for restricted contexts
      });
    } else {
      setPermission("unsupported");
    }
  }, []);

  // Sync state when subscription status changes
  useEffect(() => {
    if (subscriptionStatus?.hasActiveSubscription) {
      setIsSubscribed(true);
    }
  }, [subscriptionStatus]);

  const enableAlerts = useCallback(async () => {
    if (!roomId || !hostToken) {
      setError("Host session not verified.");
      return false;
    }

    if (!isSupported) {
      setError("Web Push is not supported in this browser context.");
      return false;
    }

    // iOS Web Push strictly requires being installed to Home Screen (Standalone PWA)
    if (isIos && !isStandalone) {
      setError("PWA_INSTALL_REQUIRED");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request user permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(perm === "denied" ? "Push notifications were denied in browser settings." : "Permission dismissed.");
        return false;
      }

      // 2. Fetch VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured in environment.");
      }

      // 3. Obtain service worker registration
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });
      }

      // 4. Extract cryptographic keys
      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");

      if (!p256dhKey || !authKey) {
        throw new Error("Failed to extract push encryption keys.");
      }

      const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey))));
      const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey))));

      // 5. Register with Convex backend (host token authenticated)
      await registerMutation({
        roomId,
        hostToken,
        endpoint: sub.endpoint,
        p256dh,
        auth,
      });

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error("Failed to enable push alerts:", err);
      setError(err?.message || "Failed to register push subscription.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, hostToken, isSupported, isIos, isStandalone, registerMutation]);

  const disableAlerts = useCallback(async () => {
    if (!roomId || !hostToken) return;
    setIsLoading(true);
    setError(null);

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await unregisterMutation({ roomId, hostToken, endpoint });
        }
      }
      setIsSubscribed(false);
    } catch (err: any) {
      console.error("Failed to disable push alerts:", err);
      setError("Failed to unregister push subscription.");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, hostToken, unregisterMutation]);

  return {
    isSupported,
    isStandalone,
    isIos,
    permission,
    isSubscribed,
    isLoading,
    error,
    needsInstallGuide: isIos && !isStandalone,
    enableAlerts,
    disableAlerts,
  };
}
