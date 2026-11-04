"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useConvexConnectionState } from "convex/react";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export interface ConnectionStateResult {
  status: ConnectionStatus;
  isOnline: boolean;
  isReconnecting: boolean;
  isHardOffline: boolean;
  canSend: boolean;
  isWebSocketConnected: boolean;
  browserOnline: boolean;
}

const GRACE_PERIOD_MS = 5000;

export function useConnectionState(): ConnectionStateResult {
  const convexState = useConvexConnectionState();
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.navigator.onLine;
    }
    return true;
  });

  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectStartRef = useRef<number | null>(null);

  // Monitor browser online/offline events
  useEffect(() => {
    function handleOnline() {
      setBrowserOnline(true);
    }
    function handleOffline() {
      setBrowserOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const evaluateConnection = useCallback(() => {
    // If browser is offline OR convex has disconnected after having connected
    const isDisconnected =
      !browserOnline ||
      (convexState.hasEverConnected && !convexState.isWebSocketConnected);

    if (!isDisconnected) {
      // Reconnected: clear any pending grace timer and set to connected
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      disconnectStartRef.current = null;
      setStatus("connected");
      return;
    }

    // Disconnected: start grace period if not already running
    if (!disconnectStartRef.current) {
      disconnectStartRef.current = Date.now();
      setStatus("reconnecting");

      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }

      graceTimerRef.current = setTimeout(() => {
        setStatus("offline");
      }, GRACE_PERIOD_MS);
    }
  }, [browserOnline, convexState.hasEverConnected, convexState.isWebSocketConnected]);

  useEffect(() => {
    evaluateConnection();
  }, [evaluateConnection]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
    };
  }, []);

  const isOnline = status === "connected";
  const isReconnecting = status === "reconnecting";
  const isHardOffline = status === "offline";
  const canSend = isOnline;

  return {
    status,
    isOnline,
    isReconnecting,
    isHardOffline,
    canSend,
    isWebSocketConnected: convexState.isWebSocketConnected,
    browserOnline,
  };
}

