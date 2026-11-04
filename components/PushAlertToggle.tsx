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
        className={`flex items-center gap-1.5 rounded-lg border font-medium transition-all shadow-sm ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${
          isSubscribed
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : permission === "denied"
            ? "border-red-300 bg-red-50 text-red-800"
            : needsInstallGuide
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            : "border-stone-200 bg-white text-stone-700 hover:border-[#EA580C] hover:text-[#EA580C]"
        }`}
      >
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isSubscribed ? (
          <BellRing size={14} className="text-emerald-600 animate-pulse" />
        ) : permission === "denied" ? (
          <BellOff size={14} className="text-red-600" />
        ) : (
          <Bell size={14} />
        )}

        <span>
          {isSubscribed
            ? compact
              ? "Alerts On"
              : "Background Alerts Active"
            : permission === "denied"
            ? "Alerts Blocked"
            : needsInstallGuide
            ? compact
              ? "Install PWA"
              : "Install PWA for Alerts"
            : compact
            ? "Alerts"
            : "Enable iPad Alerts"}
        </span>
      </button>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xl text-[#1C1917]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C] border border-orange-200">
                  {needsInstallGuide ? <Smartphone size={18} /> : <BellRing size={18} />}
                </div>
                <h3 className="text-sm font-bold text-[#1C1917]">
                  {needsInstallGuide ? "Install to iPad Home Screen" : "FOH Background Alerts"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 text-xs text-stone-600 space-y-3">
              {needsInstallGuide ? (
                <>
                  <p className="leading-relaxed">
                    Apple iOS 16.4+ requires Web Apps to be installed on your Home Screen before they can send push notifications over other mixing apps:
                  </p>
                  <ol className="list-decimal pl-4 space-y-2 text-stone-700">
                    <li>
                      Tap the <strong>Share</strong> button <span className="text-[#EA580C] font-mono">(square with arrow)</span> in iPad Safari.
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
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                    <Check size={16} className="shrink-0 text-emerald-600" />
                    <span>Push notifications are actively registered for this FOH session.</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    When you switch to your digital mixer app, new requests and urgent SOS calls will appear as visual system banners at the top of your iPad.
                  </p>
                </>
              ) : (
                <p>
                  Enable Web Push notifications to receive visual banner alerts when StageSignal is minimized or running behind your console mixing app.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-3">
              {isSubscribed ? (
                <button
                  onClick={async () => {
                    await disableAlerts();
                    setShowModal(false);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                >
                  Disable Alerts
                </button>
              ) : !needsInstallGuide ? (
                <button
                  onClick={async () => {
                    const success = await enableAlerts();
                    if (success) setShowModal(false);
                  }}
                  disabled={isLoading}
                  className="rounded-lg bg-gradient-to-r from-[#DC143C] to-[#EA580C] hover:from-[#B80F32] hover:to-[#C2410C] px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#DC143C]/20 transition"
                >
                  {isLoading ? "Enabling..." : "Allow Alerts"}
                </button>
              ) : null}

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
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
