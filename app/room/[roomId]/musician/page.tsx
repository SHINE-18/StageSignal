"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import {
  Radio,
  Mic,
  Disc,
  Sliders,
  Music,
  Volume2,
  Volume1,
  VolumeX,
  AlertTriangle,
  Send,
  Clock,
  CheckCircle2,
  Check,
  Loader2,
  WifiOff,
  History,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getOrCreateRoomParticipantToken } from "../../../../lib/profile";
import { OfflineBanner } from "../../../../components/OfflineBanner";
import { useConnectionState } from "../../../../hooks/useConnectionState";

interface PresetItem {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: typeof Volume2;
}

const PRESET_BUTTONS: PresetItem[] = [
  {
    id: "more-click",
    category: "more-click",
    label: "More Click",
    description: "Increase click track",
    icon: Volume2,
  },
  {
    id: "less-click",
    category: "less-click",
    label: "Less Click",
    description: "Decrease click track",
    icon: Volume1,
  },
  {
    id: "more-me",
    category: "more-me",
    label: "More Me",
    description: "Turn my vocal/instrument up",
    icon: Mic,
  },
  {
    id: "less-me",
    category: "less-me",
    label: "Less Me",
    description: "Turn my vocal/instrument down",
    icon: VolumeX,
  },
  {
    id: "more-bass",
    category: "more-bass",
    label: "More Bass",
    description: "Increase bass guitar in mix",
    icon: Music,
  },
  {
    id: "less-bass",
    category: "less-bass",
    label: "Less Bass",
    description: "Decrease bass in mix",
    icon: VolumeX,
  },
  {
    id: "more-drums",
    category: "more-drums",
    label: "More Drums",
    description: "Increase drum mix",
    icon: Disc,
  },
  {
    id: "more-keys",
    category: "more-keys",
    label: "More Keys",
    description: "Increase keyboard mix",
    icon: Sliders,
  },
  {
    id: "more-vocal",
    category: "more-vocal",
    label: "More Vocal",
    description: "Increase lead & backing vocals",
    icon: Mic,
  },
  {
    id: "cant-hear",
    category: "cant-hear",
    label: "Can't Hear",
    description: "Something is missing from monitor",
    icon: VolumeX,
  },
];

function MusicianStageContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as any;
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const { isOnline, canSend } = useConnectionState();

  // In-flight state per preset button and general submission guard
  const [submittingCategory, setSubmittingCategory] = useState<string | null>(null);
  const [successFeedbackId, setSuccessFeedbackId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // SOS Confirmation State
  const [showSosModal, setShowSosModal] = useState(false);
  const [isSosSubmitting, setIsSosSubmitting] = useState(false);

  // Custom message state
  const [customText, setCustomText] = useState("");
  const [customSending, setCustomSending] = useState(false);
  const [customSuccess, setCustomSuccess] = useState(false);

  // History expansion toggle
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Live ticker for client-side presence & elapsed times
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  // Retrieve room-specific participant token on mount
  useEffect(() => {
    if (roomId) {
      const storedToken = getOrCreateRoomParticipantToken(roomId);
      if (storedToken) setToken(storedToken);
    }
  }, [roomId]);

  // Server-Side Authorization Query (Phase 3 Guard)
  const session = useQuery(
    api.participants.getMusicianSession,
    token && roomId ? { roomId, participantToken: token } : "skip"
  );

  // Real-Time Subscription: Musician's own requests
  const myRequests = useQuery(
    api.requests.listMyRequests,
    token && roomId ? { roomId, participantToken: token } : "skip"
  );

  const createRequestMutation = useMutation(api.requests.createRequest);
  const heartbeatMutation = useMutation(api.presence.heartbeat);

  // If unauthorized, redirect to waiting room or join
  useEffect(() => {
    if (session && !session.authorized) {
      if (
        session.status === "pending" ||
        session.status === "rejected" ||
        session.status === "removed"
      ) {
        router.push(`/room/${roomId}/waiting`);
      } else {
        router.push("/join");
      }
    }
  }, [session, roomId, router]);

  // Heartbeat Presence Loop (Every 25 seconds, pause on tab hidden, trigger on mount/visible)
  useEffect(() => {
    if (!token || !roomId || session?.authorized !== true) return;

    function sendBeat() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof window !== "undefined" && !window.navigator.onLine) return;
      heartbeatMutation({ roomId, participantToken: token }).catch(() => {});
    }

    // Immediate beat
    sendBeat();

    // Visibility change trigger
    function handleVisibilityChange() {
      if (!document.hidden) {
        sendBeat();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(sendBeat, 25_000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, roomId, session?.authorized, heartbeatMutation]);

  // Request Submission Handler (For Presets)
  async function handleSendPreset(category: string, presetId: string) {
    if (!token || !roomId || !canSend || submittingCategory) return;
    setActionError(null);
    setSubmittingCategory(presetId);

    try {
      await createRequestMutation({
        roomId,
        participantToken: token,
        category,
      });

      // Show temporary inline "Sent" confirmation
      setSuccessFeedbackId(presetId);
      setTimeout(() => {
        setSuccessFeedbackId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to send preset request:", err);
      const msg = err instanceof Error ? err.message : "Failed to send request.";
      setActionError(msg.replace(/^Error:\s*/, ""));
    } finally {
      setSubmittingCategory(null);
    }
  }

  // SOS Submission Handler
  async function handleConfirmSos() {
    if (!token || !roomId || !canSend || isSosSubmitting) return;
    setActionError(null);
    setIsSosSubmitting(true);

    try {
      await createRequestMutation({
        roomId,
        participantToken: token,
        category: "sos",
      });
      setShowSosModal(false);
      setSuccessFeedbackId("sos");
      setTimeout(() => {
        setSuccessFeedbackId(null);
      }, 2500);
    } catch (err) {
      console.error("Failed to send SOS:", err);
      const msg = err instanceof Error ? err.message : "Failed to send urgent SOS.";
      setActionError(msg.replace(/^Error:\s*/, ""));
    } finally {
      setIsSosSubmitting(false);
    }
  }

  // Custom Message Submission Handler
  async function handleSendCustom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed || !token || !roomId || !canSend || customSending) return;

    setActionError(null);
    setCustomSending(true);

    try {
      await createRequestMutation({
        roomId,
        participantToken: token,
        category: "custom",
        message: trimmed,
      });

      setCustomText("");
      setCustomSuccess(true);
      setTimeout(() => setCustomSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to send custom message:", err);
      const msg = err instanceof Error ? err.message : "Unable to send message.";
      setActionError(msg.replace(/^Error:\s*/, ""));
    } finally {
      setCustomSending(false);
    }
  }

  // Active / in-progress request (most recent open request)
  const activeRequest = useMemo(() => {
    if (!myRequests || myRequests.length === 0) return null;
    return myRequests.find((r) => r.status === "pending" || r.status === "acknowledged") || null;
  }, [myRequests]);

  // Loading state
  if (!token || session === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] text-stone-900 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#EA580C] border border-orange-200 shadow-lg shadow-orange-500/10">
            <Radio size={24} className="animate-spin text-[#EA580C]" />
          </div>
          <h2 className="text-base font-bold">Connecting to Stage...</h2>
          <p className="text-xs text-stone-500 font-mono">
            Verifying approved musician session
          </p>
        </div>
      </main>
    );
  }

  if (!session.authorized || !session.participant) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] text-stone-900 p-4">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin text-[#EA580C]" />
          <span>Redirecting to waiting room...</span>
        </div>
      </main>
    );
  }

  const participant = session.participant;
  const isBusyAny = !!submittingCategory || isSosSubmitting || customSending;
  const controlsDisabled = !canSend || isBusyAny;

  const lastHostSeenAt = (session as any)?.lastHostSeenAt;
  const isHostOnline = lastHostSeenAt ? (currentTime - lastHostSeenAt < 75_000) : true;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col no-overscroll select-none">
      <OfflineBanner role="musician" />

      {/* Musician Top Bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FAF8F5]/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#EA580C] border border-orange-200">
              <Radio size={18} className={isOnline ? "animate-pulse" : "text-stone-400"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-stone-900 tracking-tight">
                  {participant.name}
                </span>
                <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#EA580C]">
                  {participant.instrument}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                {participant.roomName} • {participant.roomCode}
              </div>
            </div>
          </div>

          {/* Connection Chip */}
          <div>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px]">Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                <WifiOff size={12} />
                <span className="text-[11px]">Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Stage Communication Interface */}
      <main className="flex-1 mx-auto w-full max-w-lg px-3.5 py-4 sm:px-4 sm:py-5 space-y-4">
        {/* Non-Blocking Host Presence Warning (PRD Section 8 & 16) */}
        {lastHostSeenAt && !isHostOnline && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-900 border-amber-200 flex items-start gap-2.5 shadow-sm animate-in fade-in">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">FOH may be disconnected</span>
              <p className="mt-0.5 text-[11px] text-amber-200/80 leading-relaxed">
                The sound engineer&apos;s console hasn&apos;t checked in recently. You can still send cues, and FOH will see them as soon as their console reconnects.
              </p>
            </div>
          </div>
        )}

        {/* Offline Warning Banner (Disables all submissions) */}
        {!canSend && (
          <div className="rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-800 border-red-200 flex items-center gap-2">
            <WifiOff size={16} className="text-red-400 shrink-0" />
            <span>
              <strong>Disconnected from network:</strong> Request submission is disabled until connection is restored.
            </span>
          </div>
        )}

        {/* Global Action Error Toast */}
        {actionError && (
          <div className="rounded-xl border border-red-500/40 bg-red-50 p-3 text-xs text-red-800 border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-stone-900"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* LIVE REQUEST STATUS BANNER (When a request is open) */}
        {activeRequest && (
          <div
            className={`rounded-2xl border p-4 shadow-lg transition-all ${
              activeRequest.status === "acknowledged"
                ? "border-orange-300 bg-orange-50 text-orange-950"
                : activeRequest.priority === "urgent"
                ? "border-red-500/50 bg-red-50 text-red-900 border-red-200"
                : "border-amber-500/40 bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeRequest.status === "acknowledged" ? (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#FFA726] animate-pulse" />
                ) : (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {activeRequest.status === "acknowledged"
                    ? "FOH Acknowledged"
                    : activeRequest.priority === "urgent"
                    ? "Urgent SOS Pending"
                    : "Request Pending"}
                </span>
              </div>
              <span className="text-[11px] font-mono opacity-70">
                {new Date(activeRequest.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="mt-1.5 text-sm font-semibold text-stone-900">
              {activeRequest.category}: &ldquo;{activeRequest.message}&rdquo;
            </p>

            <div className="mt-2 text-xs font-medium">
              {activeRequest.status === "acknowledged" ? (
                <span className="text-orange-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#EA580C]" />
                  FOH engineer is adjusting your mix right now.
                </span>
              ) : (
                <span className="text-amber-300/90 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  Received by sound booth · Awaiting engineer acknowledgement
                </span>
              )}
            </div>
          </div>
        )}

        {/* SOS BUTTON (Prominent, High Contrast, Separated from Grid) */}
        <div>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => setShowSosModal(true)}
            className="w-full min-h-[58px] flex items-center justify-center gap-3 rounded-2xl border-2 border-red-500/60 bg-gradient-to-r from-red-950/80 to-red-900/80 px-4 py-3 text-stone-900 shadow-xl shadow-red-950/40 hover:from-red-900 hover:to-red-800 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <AlertTriangle size={24} className="text-red-400 animate-pulse" />
            <div className="text-left">
              <div className="text-sm font-black tracking-wider uppercase text-[#DC143C]">
                {successFeedbackId === "sos" ? "SOS Transmitted to FOH!" : "SOS Urgent Alert"}
              </div>
              <div className="text-[11px] text-red-700 leading-tight">
                Immediate stage emergency • Tap for confirmation
              </div>
            </div>
          </button>
        </div>

        {/* PRESET REQUEST BUTTONS GRID (10 Preset Buttons) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              One-Tap Monitor Presets
            </span>
            <span className="text-[11px] text-stone-400 font-mono">1 tap = sent</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_BUTTONS.map((preset) => {
              const Icon = preset.icon;
              const isSubmitting = submittingCategory === preset.id;
              const isSent = successFeedbackId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => handleSendPreset(preset.category, preset.id)}
                  className={`flex min-h-[56px] items-center justify-between rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSent
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500"
                      : "border-stone-200 bg-white text-stone-800 hover:border-orange-200 hover:bg-[#251E1A]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isSent
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-orange-50 text-[#EA580C]"
                      }`}
                    >
                      {isSent ? <Check size={18} /> : <Icon size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-stone-900 leading-tight">
                        {preset.label}
                      </div>
                      <div className="text-[11px] text-stone-500 line-clamp-1 leading-snug">
                        {isSent ? "Sent to FOH console" : preset.description}
                      </div>
                    </div>
                  </div>

                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin text-[#EA580C] shrink-0 ml-2" />
                  )}
                  {isSent && (
                    <span className="text-[11px] font-bold text-emerald-400 font-mono ml-2">
                      SENT
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM MESSAGE INPUT */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Custom Monitor Request
            </label>
            <span className="text-[11px] font-mono text-stone-400">
              {customText.length}/240
            </span>
          </div>

          <form onSubmit={handleSendCustom} className="space-y-2.5">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 240))}
              disabled={controlsDisabled}
              placeholder="e.g. Please add a touch of reverb to acoustic guitar..."
              rows={2}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs sm:text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:bg-white focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] disabled:opacity-50 resize-none"
            />

            <div className="flex items-center justify-between">
              {customSuccess ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check size={14} /> Request sent to FOH
                </span>
              ) : (
                <span className="text-[11px] text-stone-400">
                  Specific cue for sound engineer
                </span>
              )}

              <button
                type="submit"
                disabled={controlsDisabled || !customText.trim()}
                className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#DC143C]/20 hover:from-[#B80F32] hover:to-[#C2410C] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {customSending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send Request</span>
              </button>
            </div>
          </form>
        </div>

        {/* MY RECENT REQUEST HISTORY (Collapsible Drawer / Section) */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <History size={16} className="text-[#EA580C]" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                My Request History
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-500">
                {myRequests?.length || 0}
              </span>
            </div>
            <div className="text-stone-500">
              {isHistoryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {isHistoryExpanded && (
            <div className="pt-2 border-t border-stone-100 space-y-2">
              {myRequests && myRequests.length > 0 ? (
                myRequests.slice(0, 10).map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between rounded-xl border border-stone-100 bg-white p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <span>{req.category}</span>
                        {req.priority === "urgent" && (
                          <span className="rounded bg-red-950 px-1 py-0.2 text-[9px] font-bold text-red-400">
                            SOS
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 line-clamp-1">
                        {req.message}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          req.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : req.status === "acknowledged"
                            ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-stone-400">
                  No requests sent yet during this session.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SOS CONFIRMATION MODAL */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 rounded-3xl text-stone-900 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#DC143C] border border-red-200">
              <AlertTriangle size={32} className="animate-pulse" />
            </div>

            <h3 className="text-xl font-extrabold text-stone-900">Send Urgent SOS?</h3>
            <p className="text-xs text-stone-700 leading-relaxed">
              This will trigger a persistent red emergency alert across the FOH sound engineer&apos;s console for <strong className="text-stone-900">{participant.name}</strong> ({participant.instrument}).
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={() => setShowSosModal(false)}
                className="rounded-xl border border-stone-200 bg-stone-100 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-200 border border-stone-200 hover:text-stone-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={handleConfirmSos}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] py-3 text-xs font-bold text-white shadow-md shadow-[#DC143C]/30 hover:from-[#B80F32] hover:to-[#C2410C] transition disabled:opacity-50"
              >
                {isSosSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Confirm SOS</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MusicianPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#FAF8F5] text-stone-900">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 size={18} className="animate-spin text-[#EA580C]" />
            <span>Loading Stage Controls...</span>
          </div>
        </div>
      }
    >
      <MusicianStageContent />
    </Suspense>
  );
}
