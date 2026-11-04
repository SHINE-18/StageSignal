"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  Radio,
  Copy,
  Check,
  Maximize2,
  Loader2,
  CheckCircle2,
  UserCheck,
  UserX,
  Volume2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { LiveClock } from "./LiveClock";
import { OfflineBanner } from "./OfflineBanner";
import { PushAlertToggle } from "./PushAlertToggle";
import { PipAlertButton } from "./PipAlertButton";
import { useConnectionState } from "../hooks/useConnectionState";

function formatRelativeTime(timestamp: number, currentNow: number): string {
  const diffSec = Math.max(0, Math.floor((currentNow - timestamp) / 1000));
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export function FohMiniConsole({
  roomId,
  hostToken,
  onSwitchToFull,
}: {
  roomId: Id<"rooms">;
  hostToken: string;
  onSwitchToFull?: () => void;
}) {
  const { isOnline } = useConnectionState();
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [edgeGlow, setEdgeGlow] = useState<"blue" | "red" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Queries
  const room = useQuery(api.rooms.getHostRoom, { roomId, hostToken });
  const allRequests = useQuery(api.requests.listRequestsForHost, { roomId, hostToken });
  const participants = useQuery(api.participants.listParticipantsForHost, { roomId, hostToken });

  // Mutations
  const updateStatusMutation = useMutation(api.requests.updateRequestStatus);
  const approveMutation = useMutation(api.participants.approveParticipant);
  const rejectMutation = useMutation(api.participants.rejectParticipant);
  const hostHeartbeatMutation = useMutation(api.presence.hostHeartbeat);

  // Screen Wake Lock
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    async function requestWakeLock() {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch {
          // Quiet fallback
        }
      }
    }
    requestWakeLock();
    function onVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);

  // Host heartbeat
  useEffect(() => {
    if (!roomId || !hostToken || !room) return;
    function sendHostBeat() {
      if (document.visibilityState === "visible") {
        hostHeartbeatMutation({ roomId, hostToken }).catch(() => {});
      }
    }
    sendHostBeat();
    const interval = setInterval(sendHostBeat, 25_000);
    return () => clearInterval(interval);
  }, [roomId, hostToken, room, hostHeartbeatMutation]);

  // Reactive ticking interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  // Filter requests
  const openRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests
      .filter((r) => r.status === "pending" || r.status === "acknowledged")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allRequests]);

  const activeSos = useMemo(() => {
    return openRequests.filter((r) => r.priority === "urgent");
  }, [openRequests]);

  const pendingParticipants = useMemo(() => {
    if (!participants) return [];
    return participants.filter((p) => p.status === "pending");
  }, [participants]);

  // Edge glow detection on new incoming requests
  const prevReqCountRef = useRef<number>(0);
  useEffect(() => {
    if (!allRequests) return;
    if (prevReqCountRef.current > 0 && allRequests.length > prevReqCountRef.current) {
      const newest = allRequests[0];
      const isUrgent = newest?.priority === "urgent";
      setEdgeGlow(isUrgent ? "red" : "blue");
      const timeout = setTimeout(() => setEdgeGlow(null), isUrgent ? 2200 : 1600);
      return () => clearTimeout(timeout);
    }
    prevReqCountRef.current = allRequests.length;
  }, [allRequests]);

  // Document title and App badge updates
  useEffect(() => {
    const openCount = openRequests.length;
    const hasUnackSos = activeSos.some((s) => s.status === "pending");

    if (hasUnackSos) {
      document.title = `🚨 (${openCount}) SOS — StageSignal`;
    } else if (openCount > 0) {
      document.title = `(${openCount}) StageSignal Mini`;
    } else {
      document.title = "StageSignal — FOH Mini";
    }

    if ("setAppBadge" in navigator) {
      if (openCount > 0) {
        (navigator as any).setAppBadge(openCount).catch(() => {});
      } else if ("clearAppBadge" in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [openRequests.length, activeSos]);

  // Request actions
  const handleAcknowledge = async (requestId: Id<"requests">) => {
    setActionError(null);
    try {
      await updateStatusMutation({
        requestId,
        hostToken,
        status: "acknowledged",
      });
    } catch (err: any) {
      setActionError(err?.message || "Failed to acknowledge request.");
    }
  };

  const handleResolve = async (requestId: Id<"requests">) => {
    setActionError(null);
    try {
      await updateStatusMutation({
        requestId,
        hostToken,
        status: "resolved",
      });
    } catch (err: any) {
      setActionError(err?.message || "Failed to resolve request.");
    }
  };

  const handleApproveJoin = async (participantId: Id<"participants">) => {
    setActionError(null);
    try {
      await approveMutation({ participantId, hostToken });
    } catch (err: any) {
      setActionError(err?.message || "Failed to approve musician.");
    }
  };

  const handleRejectJoin = async (participantId: Id<"participants">) => {
    setActionError(null);
    try {
      await rejectMutation({ participantId, hostToken });
    } catch (err: any) {
      setActionError(err?.message || "Failed to reject musician.");
    }
  };

  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!room) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6129]" size={28} />
          <p className="text-xs text-stone-500 font-mono">Loading Mini Console...</p>
        </div>
      </div>
    );
  }

  const hasPersistentSos = activeSos.some((s) => s.status === "pending");

  return (
    <div
      className={`min-h-screen bg-[#000000] bg-arounda-glow text-white flex flex-col no-overscroll transition-all duration-300 ${
        hasPersistentSos
          ? "border-2 border-red-500/80 shadow-[inset_0_0_20px_rgba(239,68,68,0.3)]"
          : "border-x border-white/10"
      } ${
        edgeGlow === "red"
          ? "animate-edge-glow-red"
          : edgeGlow === "blue"
          ? "animate-edge-glow-blue"
          : ""
      }`}
    >
      <OfflineBanner role="foh" />

      {/* Slim Mini Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#000000] bg-arounda-glow/95 backdrop-blur-md px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Radio + Code */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FC3B00]/15 to-[#FF6129]/15 text-[#FF6129] border border-orange-500/30">
              <Radio size={15} className={isOnline ? "animate-pulse" : "text-slate-500"} />
            </div>
            <button
              onClick={handleCopyCode}
              title="Click to copy room code"
              className="flex items-center gap-1 font-mono text-xs font-black tracking-wider text-white hover:text-[#FF6129] transition-colors"
            >
              <span>{room.code}</span>
              {copiedCode ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="text-stone-500" />
              )}
            </button>
          </div>

          {/* Right: Controls & Switch to Full */}
          <div className="flex items-center gap-1.5 shrink-0">
            <PipAlertButton
              openCount={openRequests.length}
              hasSos={activeSos.length > 0}
              roomCode={room.code}
            />

            <PushAlertToggle roomId={roomId} hostToken={hostToken} compact />

            {onSwitchToFull ? (
              <button
                onClick={onSwitchToFull}
                title="Expand to Full FOH Dashboard"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 backdrop-blur-xl px-2 py-1 text-xs font-semibold text-stone-400 hover:border-orange-500/40 hover:text-white transition-all"
              >
                <Maximize2 size={13} />
                <span className="hidden xs:inline">Full</span>
              </button>
            ) : (
              <Link
                href={`/room/${roomId}/foh`}
                title="Expand to Full FOH Dashboard"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 backdrop-blur-xl px-2 py-1 text-xs font-semibold text-stone-400 hover:border-orange-500/40 hover:text-white transition-all"
              >
                <Maximize2 size={13} />
                <span className="hidden xs:inline">Full</span>
              </Link>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
          <div className="flex items-center gap-2">
            {/* Open Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
                openRequests.length > 0
                  ? "bg-orange-500/20 text-[#FF6129] border border-orange-500/30"
                  : "bg-slate-800 text-stone-500"
              }`}
            >
              <span>{openRequests.length} Open</span>
            </span>

            {/* SOS Badge */}
            {activeSos.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/20 px-2 py-0.5 font-bold text-red-700 animate-pulse">
                <span>🚨 {activeSos.length} SOS</span>
              </span>
            )}

            {/* Join Queue Badge */}
            {pendingParticipants.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 font-bold text-amber-800">
                <span>{pendingParticipants.length} Waiting</span>
              </span>
            )}
          </div>

          <div className="text-stone-500 font-mono text-[10px]">
            <LiveClock />
          </div>
        </div>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div className="mx-3 mt-2 flex items-center justify-between rounded-lg border border-red-500/40 bg-red-950/70 p-2 text-xs text-red-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* 1. Urgent SOS Section (Top Priority) */}
        {activeSos.length > 0 && (
          <section className="space-y-2">
            {activeSos.map((sos) => (
              <div
                key={sos._id}
                className="rounded-xl border-2 border-red-300 bg-red-50 p-3.5 shadow-sm animate-pulse-subtle"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase text-white">
                      🚨 URGENT SOS
                    </span>
                    <span className="font-bold text-white text-sm">{sos.musicianName}</span>
                  </div>
                  <span className="text-[11px] font-mono text-red-300">
                    {formatRelativeTime(sos.createdAt, currentTime)}
                  </span>
                </div>

                <div className="mt-1 text-xs text-red-200 font-medium">
                  {sos.instrument} • {sos.message}
                </div>

                {/* Big Action Buttons (min 48px height) */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {sos.status === "pending" ? (
                    <button
                      onClick={() => handleAcknowledge(sos._id)}
                      className="min-h-[48px] rounded-lg border border-orange-400 bg-gradient-to-r from-[#FC3B00] to-[#FF6129] hover:from-[#E03500] hover:to-[#F2551D] px-3 py-2 text-xs font-bold text-white shadow active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={16} />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <div className="min-h-[48px] rounded-lg border border-orange-500/40 bg-orange-500/20 px-3 py-2 text-xs font-bold text-[#FF6129] flex items-center justify-center gap-1.5">
                      <Volume2 size={16} className="animate-pulse" />
                      <span>FOH Adjusting</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleResolve(sos._id)}
                    className="min-h-[48px] rounded-lg border border-emerald-400 bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={18} />
                    <span>Resolve SOS</span>
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 2. Join Requests Tray (If any pending) */}
        {pendingParticipants.length > 0 && (
          <section className="rounded-xl border border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>Musicians Requesting Access ({pendingParticipants.length})</span>
              </span>
            </div>

            <div className="space-y-2 divide-y divide-white/5">
              {pendingParticipants.map((p) => (
                <div key={p._id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-stone-500">{p.instrument}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveJoin(p._id)}
                      title="Approve musician"
                      className="min-h-[38px] min-w-[38px] rounded-lg border border-emerald-500/40 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <UserCheck size={16} />
                    </button>
                    <button
                      onClick={() => handleRejectJoin(p._id)}
                      title="Reject musician"
                      className="min-h-[38px] min-w-[38px] rounded-lg border border-red-500/40 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Open Stage Requests List */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider px-1">
            <span>Stage Request Queue</span>
            <span>{openRequests.length} active</span>
          </div>

          {openRequests.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-6 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-white">Queue Clear</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                No active stage requests. When musicians tap monitor buttons on stage, cues appear here instantly.
              </p>
            </div>
          ) : (
            openRequests.map((req) => {
              const isUrgent = req.priority === "urgent";
              const isAck = req.status === "acknowledged";

              return (
                <div
                  key={req._id}
                  className={`rounded-xl border p-3.5 transition-all animate-request-entrance ${
                    isUrgent
                      ? "border-red-200 bg-red-50"
                      : isAck
                      ? "border-orange-200 bg-orange-50"
                      : "border-white/10 bg-black/50 backdrop-blur-xl hover:border-orange-500/30"
                  }`}
                >
                  {/* Top: Name, Instrument, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-sm text-white truncate">
                        {req.musicianName}
                      </span>
                      <span className="rounded bg-black/50 backdrop-blur-xl/10 px-1.5 py-0.5 text-[10px] font-bold text-[#FF6129] truncate">
                        {req.instrument}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-mono text-stone-500 flex items-center gap-1">
                      <Clock size={11} />
                      {formatRelativeTime(req.createdAt, currentTime)}
                    </span>
                  </div>

                  {/* Message */}
                  <div className="mt-2 text-xs text-stone-100 font-medium leading-relaxed">
                    {req.message}
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-2.5 flex items-center gap-2">
                    {isAck ? (
                      <span className="inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-[#FF6129] border border-orange-500/30">
                        <Volume2 size={12} className="animate-pulse" />
                        <span>FOH Adjusting</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>Pending Action</span>
                      </span>
                    )}
                  </div>

                  {/* Large Touch Actions (min 48px height) */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {!isAck && (
                      <button
                        onClick={() => handleAcknowledge(req._id)}
                        className="min-h-[48px] rounded-lg border border-orange-500/40 bg-gradient-to-r from-[#FC3B00] to-[#FF6129] hover:from-[#E03500] hover:to-[#F2551D] text-white font-bold text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleResolve(req._id)}
                      className={`min-h-[48px] rounded-lg font-bold text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                        isAck
                          ? "col-span-2 border border-emerald-400 bg-emerald-600 text-white shadow-md hover:bg-emerald-500"
                          : "border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                      }`}
                    >
                      <Check size={18} />
                      <span>{isAck ? "Mark Done (Resolved)" : "Resolve"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
