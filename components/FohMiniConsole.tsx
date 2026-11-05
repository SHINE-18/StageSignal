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
  AlertTriangle,
} from "lucide-react";
import { LiveClock } from "./LiveClock";
import { OfflineBanner } from "./OfflineBanner";
import { PushAlertToggle } from "./PushAlertToggle";
import { PipAlertButton } from "./PipAlertButton";
import { formatActionError } from "../lib/errors";

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
  isStandaloneRoute?: boolean;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
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
    const t = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  // Filter open & SOS requests
  const openRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests
      .filter((r) => r.status === "pending" || r.status === "acknowledged")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allRequests]);

  const activeSos = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter((r) => r.priority === "urgent" && r.status !== "resolved");
  }, [allRequests]);

  const pendingParticipants = useMemo(() => {
    if (!participants) return [];
    return participants.filter((p) => p.status === "pending");
  }, [participants]);

  // Dynamic window title count badge
  useEffect(() => {
    if (openRequests.length > 0) {
      document.title = `(${openRequests.length}) StageSignal FOH`;
    } else {
      document.title = "StageSignal FOH Mini";
    }
    if ("setAppBadge" in navigator) {
      if (openRequests.length > 0) {
        (navigator as any).setAppBadge(openRequests.length).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [openRequests.length]);

  // Handlers
  const handleAcknowledge = async (requestId: Id<"requests">) => {
    setActionError(null);
    try {
      await updateStatusMutation({ requestId, hostToken, status: "acknowledged" });
    } catch (e: any) {
      setActionError(formatActionError(e, "Failed to acknowledge request"));
    }
  };

  const handleResolve = async (requestId: Id<"requests">) => {
    setActionError(null);
    try {
      await updateStatusMutation({ requestId, hostToken, status: "resolved" });
    } catch (e: any) {
      setActionError(formatActionError(e, "Failed to resolve request"));
    }
  };

  const handleApproveJoin = async (participantId: Id<"participants">) => {
    setActionError(null);
    try {
      await approveMutation({ participantId, hostToken });
    } catch (e: any) {
      setActionError(formatActionError(e, "Failed to approve musician"));
    }
  };

  const handleRejectJoin = async (participantId: Id<"participants">) => {
    setActionError(null);
    try {
      await rejectMutation({ participantId, hostToken });
    } catch (e: any) {
      setActionError(formatActionError(e, "Failed to reject musician"));
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
      <div className="grid min-h-screen place-items-center bg-[#141415] p-4 text-[#ededed]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#fc3b00]" size={24} />
          <p className="text-xs text-[#85858b] font-mono">Loading mini console...</p>
        </div>
      </div>
    );
  }

  const hasPersistentSos = activeSos.some((s) => s.status === "pending");

  return (
    <div
      className={`min-h-screen bg-[#141415] text-[#ededed] flex flex-col no-overscroll transition-colors ${
        hasPersistentSos
          ? "border-2 border-[#e5484d]"
          : "border-x border-white/[0.08]"
      }`}
    >
      <OfflineBanner role="foh" />

      {/* Slim Mini Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0f0f10] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Radio + Code */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#19191b] text-[#fc3b00] border border-white/[0.08]">
              <Radio size={14} strokeWidth={1.5} />
            </div>
            <button
              onClick={handleCopyCode}
              title="Click to copy room code"
              className="flex items-center gap-1 font-mono text-xs font-semibold text-[#ededed] hover:text-[#fc3b00] transition-colors"
            >
              <span>{room.code}</span>
              {copiedCode ? (
                <Check size={12} className="text-[#4cc38a]" />
              ) : (
                <Copy size={11} strokeWidth={1.5} className="text-[#85858b]" />
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
                title="Expand to full dashboard"
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#19191b] px-2 py-1 text-xs font-medium text-[#ededed] hover:bg-[#232325] transition-colors"
              >
                <Maximize2 size={12} strokeWidth={1.5} />
                <span className="hidden xs:inline">Full</span>
              </button>
            ) : (
              <Link
                href={`/room/${roomId}/foh`}
                title="Expand to full dashboard"
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#19191b] px-2 py-1 text-xs font-medium text-[#ededed] hover:bg-[#232325] transition-colors"
              >
                <Maximize2 size={12} strokeWidth={1.5} />
                <span className="hidden xs:inline">Full</span>
              </Link>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px]">
          <div className="flex items-center gap-2">
            {/* Open Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono ${
                openRequests.length > 0
                  ? "bg-[#fc3b00]/15 text-[#fc3b00] border border-[#fc3b00]/30"
                  : "bg-[#232325] text-[#85858b]"
              }`}
            >
              <span>{openRequests.length} open</span>
            </span>

            {/* SOS Badge */}
            {activeSos.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-[#e5484d]/40 bg-[#2b1718] px-2 py-0.5 font-mono text-[#e5484d]">
                <AlertTriangle size={11} strokeWidth={1.5} />
                <span>{activeSos.length} SOS</span>
              </span>
            )}

            {/* Join Queue Badge */}
            {pendingParticipants.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-2 py-0.5 font-mono text-[#f59e0b]">
                <span>{pendingParticipants.length} waiting</span>
              </span>
            )}
          </div>

          <div className="text-[#85858b] font-mono text-[10px]">
            <LiveClock />
          </div>
        </div>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div className="mx-3 mt-2 flex items-center justify-between rounded-lg border border-[#e5484d]/30 bg-[#2b1718] p-2 text-xs text-[#e5484d]">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-[#85858b] hover:text-[#ededed]">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* 1. Urgent SOS Section */}
        {activeSos.length > 0 && (
          <section className="space-y-2">
            {activeSos.map((sos) => (
              <div
                key={sos._id}
                className="rounded-xl border border-[#e5484d] bg-[#2b1718] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-[#e5484d] px-1.5 py-0.5 text-[9px] font-mono uppercase text-white">
                      SOS
                    </span>
                    <span className="font-medium text-[#ededed] text-sm">{sos.musicianName}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#e5484d]">
                    {formatRelativeTime(sos.createdAt, currentTime)}
                  </span>
                </div>

                <div className="mt-1 text-xs text-[#a1a1a6]">
                  {sos.instrument} • {sos.message}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {sos.status === "pending" ? (
                    <button
                      onClick={() => handleAcknowledge(sos._id)}
                      className="min-h-[44px] rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-3 py-2 text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={15} strokeWidth={1.5} />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <div className="min-h-[44px] rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-xs font-medium text-[#f59e0b] flex items-center justify-center gap-1.5 font-mono">
                      <Volume2 size={15} strokeWidth={1.5} />
                      <span>Adjusting mix</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleResolve(sos._id)}
                    className="min-h-[44px] rounded-lg bg-[#4cc38a] hover:bg-[#43ad7b] px-3 py-2 text-xs font-medium text-[#0f0f10] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} strokeWidth={1.5} />
                    <span>Resolve SOS</span>
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 2. Join Requests Tray */}
        {pendingParticipants.length > 0 && (
          <section className="rounded-xl border border-white/[0.08] bg-[#19191b] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#f59e0b]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                <span>Musicians waiting to join ({pendingParticipants.length})</span>
              </span>
            </div>

            <div className="space-y-2 divide-y divide-white/[0.06]">
              {pendingParticipants.map((p) => (
                <div key={p._id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-xs text-[#ededed] truncate">{p.name}</div>
                    <div className="text-[10px] text-[#85858b] font-mono">{p.instrument}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveJoin(p._id)}
                      title="Approve musician"
                      className="min-h-[36px] min-w-[36px] rounded-lg bg-[#4cc38a] text-[#0f0f10] hover:bg-[#43ad7b] flex items-center justify-center transition-colors"
                    >
                      <UserCheck size={15} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleRejectJoin(p._id)}
                      title="Reject musician"
                      className="min-h-[36px] min-w-[36px] rounded-lg border border-[#e5484d]/30 bg-[#2b1718] text-[#e5484d] hover:bg-[#361a1c] flex items-center justify-center transition-colors"
                    >
                      <UserX size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Open Stage Requests List */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#85858b] px-1 font-mono">
            <span>Stage cues</span>
            <span>{openRequests.length} active</span>
          </div>

          {openRequests.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f0f10] text-[#4cc38a] border border-[#4cc38a]/20">
                <CheckCircle size={20} strokeWidth={1.5} />
              </div>
              <h4 className="text-sm font-medium text-[#ededed]">Queue clear</h4>
              <p className="text-xs text-[#85858b] max-w-xs mx-auto">
                No active stage requests. When musicians tap buttons on stage, cues appear here instantly.
              </p>
            </div>
          ) : (
            openRequests.map((req) => {
              const isUrgent = req.priority === "urgent";
              const isAck = req.status === "acknowledged";

              return (
                <div
                  key={req._id}
                  className={`rounded-lg border p-3.5 transition-colors ${
                    isUrgent
                      ? "border-[#e5484d]/50 bg-[#2b1718]"
                      : isAck
                      ? "border-[#fc3b00]/30 bg-[#0f0f10]"
                      : "border-white/[0.08] bg-[#19191b]"
                  }`}
                >
                  {/* Top: Name, Instrument, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-[#ededed] truncate">
                        {req.musicianName}
                      </span>
                      <span className="rounded border border-white/[0.08] bg-[#232325] px-1.5 py-0.5 text-[10px] font-mono text-[#a1a1a6] truncate">
                        {req.instrument}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-mono text-[#85858b] flex items-center gap-1">
                      <Clock size={11} strokeWidth={1.5} />
                      {formatRelativeTime(req.createdAt, currentTime)}
                    </span>
                  </div>

                  {/* Message */}
                  <div className="mt-1.5 text-xs text-[#ededed] leading-relaxed">
                    {req.message}
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-2 flex items-center gap-2">
                    {isAck ? (
                      <span className="inline-flex items-center gap-1 rounded border border-[#fc3b00]/30 bg-[#fc3b00]/10 px-2 py-0.5 text-[10px] font-mono text-[#fc3b00]">
                        <Volume2 size={11} strokeWidth={1.5} />
                        <span>Adjusting mix</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-mono text-[#f59e0b]">
                        <span className="h-1 w-1 rounded-full bg-[#f59e0b]" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {!isAck && (
                      <button
                        onClick={() => handleAcknowledge(req._id)}
                        className="min-h-[42px] rounded-lg bg-[#fc3b00] hover:bg-[#e03500] text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} strokeWidth={1.5} />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleResolve(req._id)}
                      className={`min-h-[42px] rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 ${
                        isAck
                          ? "col-span-2 bg-[#4cc38a] hover:bg-[#43ad7b] text-[#0f0f10]"
                          : "border border-white/[0.08] bg-[#232325] hover:bg-[#2b2b2e] text-[#ededed]"
                      }`}
                    >
                      <Check size={15} strokeWidth={1.5} />
                      <span>{isAck ? "Mark resolved" : "Resolve"}</span>
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
