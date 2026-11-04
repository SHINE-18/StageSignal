"use client";

import { useConnectionState } from "../hooks/useConnectionState";
import { WifiOff, Loader2 } from "lucide-react";

interface OfflineBannerProps {
  role?: "musician" | "foh" | "generic";
}

export function OfflineBanner({ role = "generic" }: OfflineBannerProps) {
  const { status, isOnline } = useConnectionState();

  if (isOnline) return null;

  const isReconnecting = status === "reconnecting";

  let message = "";
  if (role === "foh") {
    message = isReconnecting
      ? "Reconnecting to live stage stream..."
      : "Connection lost, data may be stale. Check church network.";
  } else if (role === "musician") {
    message = isReconnecting
      ? "Reconnecting to stage session..."
      : "You are offline. Stage sound requests are disabled until reconnected.";
  } else {
    message = isReconnecting
      ? "Reconnecting..."
      : "You are currently offline. Live requests cannot be sent until reconnected.";
  }

  return (
    <div
      role="alert"
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm font-semibold shadow-lg transition-colors duration-300 ${
        isReconnecting
          ? "bg-amber-600 text-white"
          : "bg-red-700 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        {isReconnecting ? (
          <Loader2 size={15} className="animate-spin shrink-0" />
        ) : (
          <WifiOff size={15} className="shrink-0" />
        )}
        <span>{message}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 rounded bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
        {isReconnecting ? "Reconnecting" : "Offline"}
      </div>
    </div>
  );
}
