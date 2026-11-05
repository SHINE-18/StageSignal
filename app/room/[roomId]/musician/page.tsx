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
      <main className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed] p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-[#fc3b00] border border-white/[0.08]">
            <Radio size={22} className="animate-spin text-[#fc3b00]" />
          </div>
          <h2 className="text-sm font-semibold text-[#ededed]">Connecting to stage...</h2>
          <p className="text-xs text-[#85858b] font-mono">
            Verifying approved musician session
          </p>
        </div>
      </main>
    );
  }

  if (!session.authorized || !session.participant) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed] p-4">
        <div className="flex items-center gap-2 text-sm text-[#85858b]">
          <Loader2 size={16} className="animate-spin text-[#fc3b00]" />
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
    <div className="min-h-screen bg-[#141415] text-[#ededed] flex flex-col no-overscroll select-none">
      <OfflineBanner role="musician" />

      {/* Musician Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0f0f10] px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#19191b] border border-white/[0.08] text-[#fc3b00]">
              <Radio size={16} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#ededed]">
                  {participant.name}
                </span>
                <span className="rounded border border-white/[0.08] bg-[#19191b] px-2 py-0.5 text-[10px] font-mono text-[#a1a1a6]">
                  {participant.instrument}
                </span>
              </div>
              <div className="text-[11px] text-[#85858b] font-mono">
                {participant.roomName} • {participant.roomCode}
              </div>
            </div>
          </div>

          {/* Connection Chip */}
          <div>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#4cc38a]/20 bg-[#4cc38a]/10 px-2.5 py-1 text-xs font-medium text-[#4cc38a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4cc38a]" />
                <span className="text-[11px]">Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#e5484d]/20 bg-[#e5484d]/10 px-2.5 py-1 text-xs font-medium text-[#e5484d]">
                <WifiOff size={12} strokeWidth={1.5} />
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
          <div className="rounded-lg border border-[#f59e0b]/25 bg-[#19191b] p-3.5 text-xs text-[#f59e0b] flex items-start gap-2.5">
            <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">FOH console may be offline</span>
              <p className="mt-0.5 text-[11px] text-[#a1a1a6] leading-relaxed">
                The sound engineer hasn&apos;t checked in recently. Cues sent now will queue on the server for when FOH reconnects.
              </p>
            </div>
          </div>
        )}

        {/* Offline Warning Banner */}
        {!canSend && (
          <div className="rounded-lg border border-[#e5484d]/25 bg-[#19191b] p-3.5 text-xs text-[#e5484d] flex items-center gap-2">
            <WifiOff size={16} strokeWidth={1.5} className="shrink-0" />
            <span>Connection lost. Reconnecting to stage network...</span>
          </div>
        )}

        {/* Global Action Error Toast */}
        {actionError && (
          <div className="rounded-lg border border-[#e5484d]/30 bg-[#19191b] p-3 text-xs text-[#e5484d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} strokeWidth={1.5} />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-[#85858b] hover:text-[#ededed] p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* LIVE REQUEST STATUS BANNER */}
        {activeRequest && (
          <div
            className={`rounded-xl border p-4 transition-colors ${
              activeRequest.status === "acknowledged"
                ? "border-[#4cc38a]/30 bg-[#19191b]"
                : activeRequest.priority === "urgent"
                ? "border-[#e5484d]/40 bg-[#19191b]"
                : "border-[#f59e0b]/30 bg-[#19191b]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeRequest.status === "acknowledged"
                      ? "bg-[#4cc38a]"
                      : activeRequest.priority === "urgent"
                      ? "bg-[#e5484d]"
                      : "bg-[#f59e0b]"
                  }`}
                />
                <span className="text-xs font-medium text-[#ededed]">
                  {activeRequest.status === "acknowledged"
                    ? "FOH acknowledged"
                    : activeRequest.priority === "urgent"
                    ? "Urgent SOS pending"
                    : "Request received by FOH"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#85858b]">
                {new Date(activeRequest.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="mt-2 text-sm font-medium text-[#ededed]">
              {activeRequest.category}: &ldquo;{activeRequest.message}&rdquo;
            </p>

            <div className="mt-2 text-xs">
              {activeRequest.status === "acknowledged" ? (
                <span className="text-[#4cc38a] flex items-center gap-1.5">
                  <CheckCircle2 size={14} strokeWidth={1.5} />
                  FOH engineer is adjusting your mix
                </span>
              ) : (
                <span className="text-[#85858b] flex items-center gap-1.5">
                  <Clock size={14} strokeWidth={1.5} />
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
            className="w-full min-h-[56px] flex items-center justify-between rounded-xl border border-[#e5484d]/35 bg-[#19191b] hover:bg-[#232325] px-4 py-3 text-left transition-colors disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b1718] border border-[#e5484d]/30 text-[#e5484d]">
                <AlertTriangle size={18} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#ededed]">
                  {successFeedbackId === "sos" ? "SOS transmitted to FOH" : "Emergency SOS alert"}
                </div>
                <div className="text-[11px] text-[#85858b]">
                  Urgent stage alert • Tap to confirm
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#e5484d] uppercase px-2 py-0.5 rounded border border-[#e5484d]/30">
              SOS
            </span>
          </button>
        </div>

        {/* PRESET REQUEST BUTTONS GRID */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-[#a1a1a6]">
              Monitor mix presets
            </span>
            <span className="text-[11px] text-[#85858b] font-mono">1-tap delivery</span>
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
                  className={`flex min-h-[54px] items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-40 ${
                    isSent
                      ? "border-[#4cc38a]/40 bg-[#16211a] text-[#4cc38a]"
                      : "border-white/[0.08] bg-[#19191b] hover:bg-[#232325] text-[#ededed]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSent
                          ? "bg-[#4cc38a]/20 text-[#4cc38a]"
                          : "bg-[#232325] text-[#a1a1a6] border border-white/[0.06]"
                      }`}
                    >
                      {isSent ? <Check size={16} strokeWidth={1.5} /> : <Icon size={16} strokeWidth={1.5} />}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#ededed]">
                        {preset.label}
                      </div>
                      <div className="text-[11px] text-[#85858b] line-clamp-1">
                        {isSent ? "Sent to sound engineer" : preset.description}
                      </div>
                    </div>
                  </div>

                  {isSubmitting && (
                    <Loader2 size={15} className="animate-spin text-[#fc3b00] shrink-0 ml-2" />
                  )}
                  {isSent && (
                    <span className="text-[10px] font-mono text-[#4cc38a] ml-2">
                      SENT
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM MESSAGE INPUT */}
        <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#a1a1a6]">
              Custom monitor cue
            </label>
            <span className="text-[11px] font-mono text-[#85858b]">
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
              className="w-full rounded-lg border border-white/[0.08] bg-[#0f0f10] p-3 text-xs text-[#ededed] placeholder-[#85858b]/60 outline-none transition-colors focus:border-[#fc3b00] disabled:opacity-50 resize-none"
            />

            <div className="flex items-center justify-between">
              {customSuccess ? (
                <span className="text-xs font-medium text-[#4cc38a] flex items-center gap-1.5">
                  <Check size={14} /> Request sent to FOH
                </span>
              ) : (
                <span className="text-[11px] text-[#85858b]">
                  Sent directly to FOH mixing desk
                </span>
              )}

              <button
                type="submit"
                disabled={controlsDisabled || !customText.trim()}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#fc3b00] px-3.5 text-xs font-medium text-white hover:bg-[#e03500] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] disabled:opacity-40"
              >
                {customSending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} strokeWidth={1.5} />
                )}
                <span>Send cue</span>
              </button>
            </div>
          </form>
        </div>

        {/* MY RECENT REQUEST HISTORY */}
        <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-4 space-y-3">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <History size={15} strokeWidth={1.5} className="text-[#a1a1a6]" />
              <span className="text-xs font-medium text-[#a1a1a6]">
                Request history
              </span>
              <span className="rounded border border-white/[0.08] bg-[#232325] px-1.5 py-0.2 text-[10px] font-mono text-[#85858b]">
                {myRequests?.length || 0}
              </span>
            </div>
            <div className="text-[#85858b]">
              {isHistoryExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </button>

          {isHistoryExpanded && (
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              {myRequests && myRequests.length > 0 ? (
                myRequests.slice(0, 10).map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0f0f10] p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-medium text-[#ededed] flex items-center gap-2">
                        <span>{req.category}</span>
                        {req.priority === "urgent" && (
                          <span className="rounded bg-[#e5484d]/15 px-1.5 py-0.5 text-[9px] font-mono text-[#e5484d] border border-[#e5484d]/30">
                            SOS
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#85858b] line-clamp-1 mt-0.5">
                        {req.message}
                      </div>
                      <div className="text-[10px] text-[#85858b] font-mono mt-0.5">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono ${
                          req.status === "resolved"
                            ? "bg-[#4cc38a]/10 text-[#4cc38a] border border-[#4cc38a]/20"
                            : req.status === "acknowledged"
                            ? "bg-[#fc3b00]/10 text-[#fc3b00] border border-[#fc3b00]/25"
                            : "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[#85858b]">
                  No requests sent yet during this session
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SOS CONFIRMATION MODAL */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#19191b] p-6 text-[#ededed] text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#2b1718] text-[#e5484d] border border-[#e5484d]/30">
              <AlertTriangle size={24} strokeWidth={1.5} />
            </div>

            <h3 className="text-base font-semibold text-[#ededed]">Send urgent emergency SOS?</h3>
            <p className="text-xs text-[#a1a1a6] leading-relaxed">
              This triggers a high-visibility emergency alert across the FOH sound console for <strong className="text-[#ededed]">{participant.name}</strong> ({participant.instrument}).
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={() => setShowSosModal(false)}
                className="h-10 rounded-lg border border-white/[0.08] bg-[#232325] text-xs font-medium text-[#ededed] hover:bg-[#2b2b2e] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSosSubmitting}
                onClick={handleConfirmSos}
                className="h-10 flex items-center justify-center gap-1.5 rounded-lg bg-[#e5484d] text-xs font-medium text-white hover:bg-[#d03d42] transition-colors disabled:opacity-50"
              >
                {isSosSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
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
        <div className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed]">
          <div className="flex items-center gap-2 text-sm text-[#85858b]">
            <Loader2 size={16} className="animate-spin text-[#fc3b00]" />
            <span>Loading stage console...</span>
          </div>
        </div>
      }
    >
      <MusicianStageContent />
    </Suspense>
  );
}
