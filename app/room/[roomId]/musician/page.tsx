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
import { formatActionError } from "../../../../lib/errors";

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
    description: "Increase lead vocal in mix",
    icon: Mic,
  },
  {
    id: "less-vocal",
    category: "less-vocal",
    label: "Less Vocal",
    description: "Decrease vocal in mix",
    icon: VolumeX,
  },
];

function MusicianStageContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as any;
  const router = useRouter();

  const [token, setToken] = useState("");
  const { isOnline, canSend: connectionCanSend } = useConnectionState();

  // Local state for actions and feedback
  const [submittingCategory, setSubmittingCategory] = useState<string | null>(null);
  const [successFeedbackId, setSuccessFeedbackId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // SOS Confirmation Modal State
  const [showSosModal, setShowSosModal] = useState(false);
  const [isSosSubmitting, setIsSosSubmitting] = useState(false);

  // Custom text request state
  const [customText, setCustomText] = useState("");
  const [customSending, setCustomSending] = useState(false);
  const [customSuccess, setCustomSuccess] = useState(false);

  // Collapsible history drawer state
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Ticking client clock for reactive presence calculations
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Retrieve token on mount
  useEffect(() => {
    if (roomId) {
      const roomToken = getOrCreateRoomParticipantToken(roomId);
      if (roomToken) {
        setToken(roomToken);
      }
    }
  }, [roomId]);

  // Server-Side Authorization Query (Phase 3 Guard)
  const session = useQuery(
    api.participants.getMusicianSession,
    token && roomId ? { roomId, participantToken: token } : "skip"
  );

  // Reactive subscription: List my own requests strictly scoped to my participantId
  const myRequests = useQuery(
    api.requests.listMyRequests,
    token && roomId ? { roomId, participantToken: token } : "skip"
  );

  // Convex mutations
  const createRequestMutation = useMutation(api.requests.createRequest);
  const heartbeatMutation = useMutation(api.presence.heartbeat);

  // Participant Presence Heartbeat: Every 25 seconds while active
  useEffect(() => {
    if (!token || !roomId || session?.authorized !== true) return;

    function sendBeat() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof window !== "undefined" && !window.navigator.onLine) return;
      heartbeatMutation({ roomId, participantToken: token }).catch(() => {
        // Heartbeat failure ignored; will retry on next interval
      });
    }

    sendBeat();
    const interval = setInterval(sendBeat, 25_000);
    return () => clearInterval(interval);
  }, [token, roomId, session?.authorized, heartbeatMutation]);

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

  // Network and session readiness
  const canSend = connectionCanSend && session?.authorized === true;

  // Preset Request Submission Handler
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

      setSuccessFeedbackId(presetId);
      setTimeout(() => {
        setSuccessFeedbackId(null);
      }, 2500);
    } catch (err) {
      console.error("Failed to send preset request:", err);
      setActionError(formatActionError(err, "Failed to send request."));
    } finally {
      setSubmittingCategory(null);
    }
  }

  // SOS Confirmation & Dispatch Handler
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
      setActionError(formatActionError(err, "Failed to send urgent SOS."));
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
      setActionError(formatActionError(err, "Unable to send message."));
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
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/10">
            <Radio size={22} className="animate-spin text-[#FC3B00]" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Connecting to Stage...</h2>
          <p className="text-xs text-stone-400 font-mono">
            Verifying approved musician session
          </p>
        </div>
      </main>
    );
  }

  if (!session.authorized || !session.participant) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white p-4">
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 size={16} className="animate-spin text-[#FC3B00]" />
          <span>Connecting to stage session...</span>
        </div>
      </main>
    );
  }

  const participant = session.participant;
  const isBusyAny = !!submittingCategory || isSosSubmitting || customSending;
  const controlsDisabled = !canSend || isBusyAny;

  const lastHostSeenAt = (session as any)?.lastHostSeenAt;
  const isHostOnline = lastHostSeenAt ? currentTime - lastHostSeenAt < 75_000 : true;

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white flex flex-col no-overscroll select-none">
      <OfflineBanner role="musician" />

      {/* Musician Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/75 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
              <Radio size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {participant.name}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#FF7145]">
                  {participant.instrument}
                </span>
              </div>
              <div className="text-[11px] text-stone-400 font-mono">
                {participant.roomName} • {participant.roomCode}
              </div>
            </div>
          </div>

          {/* Connection Chip */}
          <div>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px]">Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-400">
                <WifiOff size={12} strokeWidth={2} />
                <span className="text-[11px]">Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Stage Communication Interface */}
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-5 space-y-4">
        {/* Non-Blocking Host Presence Warning */}
        {lastHostSeenAt && !isHostOnline && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">FOH Console May Be Offline</span>
              <p className="mt-0.5 text-[11px] text-stone-300 leading-relaxed">
                The sound engineer hasn&apos;t checked in recently. Cues sent now will queue on the server for when FOH reconnects.
              </p>
            </div>
          </div>
        )}

        {/* Offline Warning Banner */}
        {!canSend && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300 flex items-center gap-2">
            <WifiOff size={16} className="shrink-0 text-red-400" />
            <span>Connection lost. Reconnecting to stage network...</span>
          </div>
        )}

        {/* Global Action Error Toast */}
        {actionError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/50 p-3 text-xs text-red-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* LIVE REQUEST STATUS BANNER */}
        {activeRequest && (
          <div
            className={`rounded-2xl border p-4 backdrop-blur-md transition-colors ${
              activeRequest.status === "acknowledged"
                ? "border-emerald-500/40 bg-emerald-950/30"
                : activeRequest.priority === "urgent"
                ? "border-[#FC3B00]/50 bg-red-950/40 shadow-lg shadow-[#FC3B00]/15"
                : "border-[#FF6129]/35 bg-black/60 shadow-lg shadow-[#FF6129]/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeRequest.status === "acknowledged"
                      ? "bg-emerald-400"
                      : activeRequest.priority === "urgent"
                      ? "bg-[#FC3B00] animate-ping"
                      : "bg-[#FF6129] animate-pulse"
                  }`}
                />
                <span className="text-xs font-bold text-white">
                  {activeRequest.status === "acknowledged"
                    ? "FOH Acknowledged"
                    : activeRequest.priority === "urgent"
                    ? "Urgent SOS Pending"
                    : "Request Received by FOH"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {new Date(activeRequest.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-white">
              {activeRequest.category}: &ldquo;{activeRequest.message}&rdquo;
            </p>

            <div className="mt-2 text-xs">
              {activeRequest.status === "acknowledged" ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} />
                  FOH engineer is adjusting your mix
                </span>
              ) : (
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#FF6129]" />
                  Awaiting sound engineer acknowledgement
                </span>
              )}
            </div>
          </div>
        )}

        {/* SOS BUTTON (Studio Emergency Switch) */}
        <div>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => setShowSosModal(true)}
            className="w-full min-h-[58px] flex items-center justify-between rounded-2xl border border-[#FC3B00]/35 bg-black/50 backdrop-blur-md hover:bg-black/70 hover:border-[#FC3B00]/60 p-4 text-left transition shadow-lg shadow-[#FC3B00]/10 disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {successFeedbackId === "sos" ? "SOS Transmitted to FOH" : "Emergency SOS Alert"}
                </div>
                <div className="text-[11px] text-stone-400">
                  Urgent stage alert • Tap to confirm
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#FF7145] uppercase px-3 py-1 rounded-full border border-[#FC3B00]/30 bg-[#FC3B00]/10 font-bold">
              SOS
            </span>
          </button>
        </div>

        {/* PRESET REQUEST BUTTONS GRID */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Monitor Mix Presets
            </span>
            <span className="text-[11px] text-[#FF7145] font-mono">1-tap delivery</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className={`flex min-h-[56px] items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition disabled:opacity-40 backdrop-blur-md ${
                    isSent
                      ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-500/10"
                      : "border-white/10 bg-black/50 hover:border-[#FF6129]/50 hover:bg-white/[0.04] text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isSent
                          ? "bg-emerald-900/40 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/5 text-stone-300 border border-white/10"
                      }`}
                    >
                      {isSent ? <Check size={18} className="text-emerald-400" /> : <Icon size={18} className="text-[#FF7145]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {preset.label}
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1">
                        {isSent ? "Sent to sound engineer" : preset.description}
                      </div>
                    </div>
                  </div>

                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin text-[#FC3B00] shrink-0 ml-2" />
                  )}
                  {isSent && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold ml-2">
                      SENT
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM MESSAGE INPUT */}
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Custom Monitor Cue
            </label>
            <span className="text-[11px] font-mono text-stone-500">
              {customText.length}/240
            </span>
          </div>

          <form onSubmit={handleSendCustom} className="space-y-3">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 240))}
              disabled={controlsDisabled}
              placeholder="e.g. Add slightly more reverb to vocal..."
              rows={2}
              className="w-full rounded-xl border border-white/15 bg-black/60 p-3.5 text-xs text-white placeholder-stone-500 outline-none transition focus:border-[#FC3B00] focus:ring-1 focus:ring-[#FC3B00] disabled:opacity-50 resize-none"
            />

            <div className="flex items-center justify-between">
              {customSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check size={14} /> Request sent to FOH
                </span>
              ) : (
                <span className="text-[11px] text-stone-400">
                  Sent directly to FOH mixing desk
                </span>
              )}

              <button
                type="submit"
                disabled={controlsDisabled || !customText.trim()}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-4 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition disabled:opacity-40"
              >
                {customSending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send Cue</span>
              </button>
            </div>
          </form>
        </div>

        {/* MY RECENT REQUEST HISTORY */}
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4 space-y-3">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <History size={15} className="text-[#FF7145]" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Request History
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#FF7145] font-bold">
                {myRequests?.length || 0}
              </span>
            </div>
            <div className="text-stone-400">
              {isHistoryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {isHistoryExpanded && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              {myRequests && myRequests.length > 0 ? (
                myRequests.slice(0, 10).map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{req.category}</span>
                        {req.priority === "urgent" && (
                          <span className="rounded-full bg-red-950/60 px-2 py-0.5 text-[9px] font-mono font-bold text-[#FC3B00] border border-red-500/30">
                            SOS
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {req.message}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold ${
                          req.status === "resolved"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                            : req.status === "acknowledged"
                            ? "bg-orange-950/60 text-[#FF6129] border border-orange-500/30"
                            : "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-stone-500">
                  No requests sent yet during this session
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SOS CONFIRMATION MODAL */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#0d0c0e] p-6 text-white text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/30 to-red-950 text-[#FC3B00] border border-[#FC3B00]/40 shadow-lg shadow-[#FC3B00]/20">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">Send Urgent Emergency SOS?</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              This triggers a high-visibility emergency alert across the FOH sound console for <strong className="text-white">{participant.name}</strong> ({participant.instrument}).
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={() => setShowSosModal(false)}
                className="h-11 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={handleConfirmSos}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] text-xs font-bold text-white shadow-lg shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition disabled:opacity-50"
              >
                {isSosSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Transmitting...</span>
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
        <div className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={16} className="animate-spin text-[#FC3B00]" />
            <span>Loading stage console...</span>
          </div>
        </div>
      }
    >
      <MusicianStageContent />
    </Suspense>
  );
}
