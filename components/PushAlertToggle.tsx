"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Smartphone, Check, X, AlertTriangle } from "lucide-react";
import { usePushAlerts } from "../hooks/usePushAlerts";
import { Id } from "../convex/_generated/dataModel";

export function PushAlertToggle({
  roomId,
  hostToken,
  compact = false,
}: {
  roomId: Id<"rooms"> | null;
  hostToken: string | null;
  compact?: boolean;
}) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    needsInstallGuide,
    enableAlerts,
    disableAlerts,
  } = usePushAlerts({ roomId, hostToken });

  const [showModal, setShowModal] = useState(false);

  // If push is completely unsupported in this browser engine
  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          if (needsInstallGuide) {
            setShowModal(true);
          } else if (isSubscribed) {
            setShowModal(true);
          } else {
            enableAlerts();
          }
        }}
        disabled={isLoading}
        title={
          isSubscribed
            ? "Push alerts active for background notifications"
            : needsInstallGuide
            ? "Install PWA on iPad to enable background alerts"
            : "Enable background push alerts when mixing in other apps"
        }
        className={`flex items-center gap-1.5 rounded-lg border font-medium transition-colors ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${
          isSubscribed
            ? "border-emerald-500/30 bg-emerald-950/30 text-[#4cc38a]"
            : permission === "denied"
            ? "border-red-500/30 bg-red-950/30 text-red-400"
            : needsInstallGuide
            ? "border-amber-500/30 bg-amber-950/30 text-amber-300"
            : "border-white/15 bg-white/5 text-stone-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isSubscribed ? (
          <BellRing size={13} className="text-[#4cc38a]" />
        ) : permission === "denied" ? (
          <BellOff size={13} className="text-red-400" />
        ) : (
          <Bell size={13} className="text-[#FF7145]" />
        )}

        <span>
          {isSubscribed
            ? compact
              ? "Alerts on"
              : "Alerts active"
            : permission === "denied"
            ? "Alerts blocked"
            : needsInstallGuide
            ? compact
              ? "Install PWA"
              : "Install PWA for alerts"
            : compact
            ? "Alerts"
            : "Enable iPad alerts"}
        </span>
      </button>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#0d0c0e] p-6 text-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
                  {needsInstallGuide ? <Smartphone size={16} /> : <BellRing size={16} />}
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {needsInstallGuide ? "Install to iPad Home Screen" : "FOH Background Alerts"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 text-xs text-stone-300 space-y-3 leading-relaxed">
              {needsInstallGuide ? (
                <>
                  <p>
                    Apple iOS 16.4+ requires Web Apps to be installed on your Home Screen before they can send push notifications over other mixing apps:
                  </p>
                  <ol className="list-decimal pl-4 space-y-2 text-white">
                    <li>
                      Tap the <strong>Share</strong> button <span className="text-[#FF7145] font-mono">(square with arrow)</span> in iPad Safari.
                    </li>
                    <li>
                      Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                    </li>
                    <li>
                      Launch <strong>StageSignal</strong> directly from your iPad Home Screen icon.
                    </li>
                    <li>
                      Reopen this session to enable background visual alerts while mixing in Yamaha/Behringer apps.
                    </li>
                  </ol>
                </>
              ) : isSubscribed ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3 text-emerald-300">
                    <Check size={16} className="shrink-0 text-emerald-400" />
                    <span>Push notifications are actively registered for this FOH session.</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    When you switch to your digital mixer app, new requests and urgent SOS calls will appear as visual system banners at the top of your iPad.
                  </p>
                </>
              ) : (
                <p>
                  Enable Web Push notifications to receive visual banner alerts when StageSignal is minimized or running behind your console mixing app.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-2.5 text-[11px] text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              {isSubscribed ? (
                <button
                  onClick={async () => {
                    await disableAlerts();
                    setShowModal(false);
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition"
                >
                  Disable alerts
                </button>
              ) : !needsInstallGuide ? (
                <button
                  onClick={async () => {
                    const success = await enableAlerts();
                    if (success) setShowModal(false);
                  }}
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/25 transition hover:from-[#E03500] hover:to-[#F2551D]"
                >
                  {isLoading ? "Enabling..." : "Allow alerts"}
                </button>
              ) : null}

              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
