"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  Radio,
  Users,
  Copy,
  Check,
  ShieldAlert,
  PowerOff,
  QrCode,
  AlertTriangle,
  Loader2,
  Volume2,
  CheckCircle2,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  X,
  History,
  Search,
  CheckCircle,
  Minimize2,
} from "lucide-react";
import { getHostToken } from "../../../../lib/session";
import { LiveClock } from "../../../../components/LiveClock";
import { QRCodeModal } from "../../../../components/QRCodeModal";
import { OfflineBanner } from "../../../../components/OfflineBanner";
import { useConnectionState } from "../../../../hooks/useConnectionState";
import { FohMiniConsole } from "../../../../components/FohMiniConsole";
import { PushAlertToggle } from "../../../../components/PushAlertToggle";
import { PipAlertButton } from "../../../../components/PipAlertButton";
import { formatActionError } from "../../../../lib/errors";

type RequestFilter = "open" | "sos" | "pending" | "acknowledged" | "resolved" | "all";

function formatRelativeTime(timestamp: number, currentNow: number): string {
  const diffSec = Math.max(0, Math.floor((currentNow - timestamp) / 1000));
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

function formatDuration(start: number, end?: number): string {
  if (!end) return "";
  const sec = Math.max(1, Math.round((end - start) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  return `${min}m ${remainingSec}s`;
}

export default function FohConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white">
          <Loader2 className="animate-spin text-[#FC3B00]" size={24} />
        </div>
      }
    >
      <FohConsoleContent />
    </Suspense>
  );
}

function FohConsoleContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as any;

  const [hostToken, setHostToken] = useState<string | null>(null);
  const [hasCheckedToken, setHasCheckedToken] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [endingRoom, setEndingRoom] = useState(false);

  // Participant action loading states
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Request filter & search
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("open");
  const [searchQuery, setSearchQuery] = useState("");

  // Live ticker for relative timestamps
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Compact Mini-Console View (for iPad Slide Over / Split Views < 600px)
  const [isCompactView, setIsCompactView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function checkViewport() {
      if (window.innerWidth < 600) {
        setIsCompactView(true);
      }
    }
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refresh relative timestamps every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Load raw host token from localStorage
  useEffect(() => {
    if (!roomId) return;
    const token = getHostToken(roomId);
    setHostToken(token);
    setHasCheckedToken(true);
  }, [roomId]);

  // Reactive subscription to room details (host-only)
  const room = useQuery(
    api.rooms.getHostRoom,
    hostToken ? { roomId, hostToken } : "skip"
  );

  // Reactive subscription to participants in room (host-only)
  const participants = useQuery(
    api.participants.listParticipantsForHost,
    hostToken ? { roomId, hostToken } : "skip"
  );

  // Reactive subscription to requests in room (host-only)
  const requests = useQuery(
    api.requests.listRequestsForHost,
    hostToken ? { roomId, hostToken } : "skip"
  );

  const endRoomMutation = useMutation(api.rooms.endRoom);
  const approveParticipantMutation = useMutation(api.participants.approveParticipant);
  const rejectParticipantMutation = useMutation(api.participants.rejectParticipant);
  const removeParticipantMutation = useMutation(api.participants.removeParticipant);
  const updateRequestStatusMutation = useMutation(api.requests.updateRequestStatus);
  const hostHeartbeatMutation = useMutation(api.presence.hostHeartbeat);

  const { canSend } = useConnectionState();

  // Host Heartbeat Loop (Runs every 25s, pauses on tab hidden, triggers on mount & visible)
  useEffect(() => {
    if (!hostToken || !roomId || !room || room.status === "ended") return;
    const currentToken: string = hostToken;

    function sendBeat() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof window !== "undefined" && !window.navigator.onLine) return;
      hostHeartbeatMutation({ roomId, hostToken: currentToken }).catch(() => {});
    }

    sendBeat();

    function handleVisibility() {
      if (!document.hidden) {
        sendBeat();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(sendBeat, 25_000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hostToken, roomId, room, hostHeartbeatMutation]);

  // Screen Wake Lock API for iPad Landscape Operation
  useEffect(() => {
    let wakeLock: any = null;

    async function requestWakeLock() {
      if (
        typeof navigator !== "undefined" &&
        "wakeLock" in navigator &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        } catch {
          // Fail silently if unsupported or denied
        }
      }
    }

    requestWakeLock();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Accidental Navigation Guard on Active FOH Session
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (room && room.status === "active" && !room.isExpired) {
        e.preventDefault();
        e.returnValue = "Active stage session in progress. Leave FOH console?";
        return e.returnValue;
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [room]);

  const joinUrl =
    typeof window !== "undefined" && room
      ? `${window.location.origin}/join?code=${room.code}`
      : "";

  // Render QR code to inline canvas whenever room code or joinUrl is ready
  useEffect(() => {
    if (qrCanvasRef.current && joinUrl) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        joinUrl,
        {
          width: 170,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("Error drawing inline QR canvas:", err);
        }
      );
    }
  }, [joinUrl]);

  // Derived participant collections
  const pendingParticipants = useMemo(
    () => (participants || []).filter((p) => p.status === "pending"),
    [participants]
  );

  const approvedParticipants = useMemo(
    () => (participants || []).filter((p) => p.status === "approved"),
    [participants]
  );

  // Derived request collections
  const allRequests = useMemo(() => requests || [], [requests]);

  const openRequests = useMemo(
    () => allRequests.filter((r) => r.status === "pending" || r.status === "acknowledged"),
    [allRequests]
  );

  const urgentSosRequests = useMemo(
    () =>
      allRequests.filter(
        (r) => r.priority === "urgent" && r.status !== "resolved"
      ),
    [allRequests]
  );

  const pendingRequests = useMemo(
    () => allRequests.filter((r) => r.status === "pending"),
    [allRequests]
  );

  const acknowledgedRequests = useMemo(
    () => allRequests.filter((r) => r.status === "acknowledged"),
    [allRequests]
  );

  const resolvedRequests = useMemo(
    () => allRequests.filter((r) => r.status === "resolved"),
    [allRequests]
  );

  // Filtered requests according to active filter tab and search query
  const filteredRequests = useMemo(() => {
    let list = allRequests;
    switch (requestFilter) {
      case "open":
        list = openRequests;
        break;
      case "sos":
        list = urgentSosRequests;
        break;
      case "pending":
        list = pendingRequests;
        break;
      case "acknowledged":
        list = acknowledgedRequests;
        break;
      case "resolved":
        list = resolvedRequests;
        break;
      case "all":
      default:
        list = allRequests;
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.musicianName.toLowerCase().includes(q) ||
          r.instrument.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [
    allRequests,
    requestFilter,
    openRequests,
    urgentSosRequests,
    pendingRequests,
    acknowledgedRequests,
    resolvedRequests,
    searchQuery,
  ]);

  const maxCapacity = room?.capacity ?? room?.maxApproved ?? 8;
  const isRoomFull = approvedParticipants.length >= maxCapacity;

  async function handleCopyCode() {
    if (!room?.code) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleCopyLink() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleConfirmEndRoom() {
    if (!hostToken || !roomId) return;
    setEndingRoom(true);
    try {
      await endRoomMutation({ roomId, hostToken });
      setIsEndModalOpen(false);
    } catch (err) {
      console.error("Failed to end room:", err);
      alert(err instanceof Error ? err.message : "Failed to end room.");
    } finally {
      setEndingRoom(false);
    }
  }

  // Host Participant Actions
  async function handleApprove(participantId: any) {
    if (!hostToken) return;
    setQueueError(null);
    setActionBusyId(participantId);
    try {
      await approveParticipantMutation({ participantId, hostToken });
    } catch (err) {
      console.error("Failed to approve participant:", err);
      setQueueError(formatActionError(err, "Unable to approve participant."));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleReject(participantId: any) {
    if (!hostToken) return;
    setQueueError(null);
    setActionBusyId(participantId);
    try {
      await rejectParticipantMutation({ participantId, hostToken });
    } catch (err) {
      console.error("Failed to reject participant:", err);
      setQueueError(formatActionError(err, "Unable to reject participant."));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleRemove(participantId: any) {
    if (!hostToken) return;
    if (!window.confirm("Remove this musician from the stage session?")) return;
    setQueueError(null);
    setActionBusyId(participantId);
    try {
      await removeParticipantMutation({ participantId, hostToken });
    } catch (err) {
      console.error("Failed to remove participant:", err);
      setQueueError(formatActionError(err, "Unable to remove participant."));
    } finally {
      setActionBusyId(null);
    }
  }

  // Host Request Status Actions
  async function handleAcknowledgeRequest(requestId: any) {
    if (!hostToken) return;
    setQueueError(null);
    setRequestBusyId(requestId);
    try {
      await updateRequestStatusMutation({
        requestId,
        hostToken,
        status: "acknowledged",
      });
    } catch (err) {
      console.error("Failed to acknowledge request:", err);
      setQueueError(formatActionError(err, "Failed to acknowledge request."));
    } finally {
      setRequestBusyId(null);
    }
  }

  async function handleResolveRequest(requestId: any) {
    if (!hostToken) return;
    setQueueError(null);
    setRequestBusyId(requestId);
    try {
      await updateRequestStatusMutation({
        requestId,
        hostToken,
        status: "resolved",
      });
    } catch (err) {
      console.error("Failed to resolve request:", err);
      setQueueError(formatActionError(err, "Failed to resolve request."));
    } finally {
      setRequestBusyId(null);
    }
  }

  // 1. Loading state while checking localStorage credentials or awaiting Convex query
  if (!hasCheckedToken || (hostToken && room === undefined)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/10">
            <Radio size={22} className="animate-spin text-[#FC3B00]" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Connecting to FOH Console...</h2>
          <p className="text-xs text-stone-400 font-mono">
            Verifying cryptographic host credentials for room ID: {roomId}
          </p>
        </div>
      </main>
    );
  }

  // 2. Access Denied: Missing or Invalid Host Token
  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow p-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0d0c0e] p-8 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-red-950 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/20">
            <ShieldAlert size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Access Denied</h1>
          <p className="text-xs text-stone-300 leading-relaxed">
            {!hostToken
              ? "Host session credentials were not found on this device. You can only manage this FOH console from the browser where the room was created."
              : "Invalid host session token. The cryptographic credentials presented do not match this stage room's host key."}
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/create-room"
              className="h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] text-xs font-bold text-white shadow-md shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition"
            >
              Create New Stage Room
            </Link>
            <Link
              href="/"
              className="h-11 flex items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isCompactView && hostToken && roomId) {
    return (
      <FohMiniConsole
        roomId={roomId}
        hostToken={hostToken}
        onSwitchToFull={() => setIsCompactView(false)}
      />
    );
  }

  const isRoomEnded = room.status === "ended";
  const isRoomExpired = room.isExpired;
  const isReadOnly = isRoomEnded || isRoomExpired;

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow text-white flex flex-col no-overscroll selection:bg-[#FC3B00] selection:text-white">
      <OfflineBanner role="foh" />

      {/* Console Top Header — Minimal & Sleek */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/75 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Brand & Room Info with 1-Tap Copy Pill */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group" title="Return to Overview">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
                <Radio size={16} strokeWidth={2} />
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {room.name}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Click to copy room code"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300 hover:bg-white/10 transition"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[11px] font-bold text-[#FF7145]">{room.code}</span>
                  {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-stone-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Minimal Utilities */}
          <div className="flex items-center gap-2">
            <LiveClock />

            {/* QR Invite Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
              title="Musician QR Invitation"
            >
              <QrCode size={13} className="text-[#FF7145]" />
              <span className="hidden sm:inline">QR Invite</span>
            </button>

            {/* Compact Mini-Console View Toggle */}
            <button
              type="button"
              onClick={() => setIsCompactView(true)}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition"
              title="Compact View"
            >
              <Minimize2 size={16} />
            </button>

            {/* Service History Link */}
            <Link
              href={`/room/${roomId}/history`}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition"
              title="Service History"
            >
              <History size={16} strokeWidth={1.5} />
            </Link>

            {/* End Room CTA */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="rounded-full border border-red-500/30 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition"
              >
                End
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Console Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Read-Only Alert Banner if Ended/Expired */}
        {isReadOnly && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200 flex items-start gap-3 backdrop-blur-md">
            <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                {isRoomEnded ? "This stage session has ended." : "This stage session has expired."}
              </p>
              <p className="mt-0.5 text-xs text-amber-200/80">
                New musician join requests and audio mix cues are locked. All historical events and request data remain available in read-only audit mode.
              </p>
            </div>
          </div>
        )}

        {/* PERSISTENT URGENT SOS ALERT BANNER */}
        {urgentSosRequests.length > 0 && (
          <section
            aria-label="Urgent SOS Alerts"
            className="rounded-2xl border border-[#FC3B00]/50 bg-black/70 backdrop-blur-md p-4 sm:p-5 text-white shadow-xl shadow-[#FC3B00]/15 animate-in fade-in duration-200"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FC3B00] animate-ping" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <AlertTriangle size={16} strokeWidth={2} className="text-[#FC3B00]" />
                      Emergency SOS Active
                    </h2>
                    <span className="rounded-full bg-[#FC3B00]/20 px-2.5 py-0.5 text-xs font-mono font-bold text-[#FF7145] border border-[#FC3B00]/30">
                      {urgentSosRequests.length} {urgentSosRequests.length === 1 ? "alert" : "alerts"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-stone-400 hidden sm:inline font-mono">
                  Visual-only alert • Persistent until resolved
                </span>
              </div>

              {/* List of active SOS items with 1-tap actions */}
              <div className="space-y-2 mt-1">
                {urgentSosRequests.map((sos) => {
                  const isBusy = requestBusyId === sos._id;
                  const isAck = sos.status === "acknowledged";
                  return (
                    <div
                      key={sos._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#FC3B00]/30 bg-black/60 backdrop-blur-md p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/30 to-red-950 text-[#FC3B00] font-mono font-bold text-xs border border-[#FC3B00]/40 shadow-md shadow-[#FC3B00]/10">
                          SOS
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {sos.musicianName}
                            </span>
                            <span className="rounded-full border border-[#FC3B00]/30 bg-[#FC3B00]/10 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF7145]">
                              {sos.instrument}
                            </span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              • {formatRelativeTime(sos.createdAt, currentTime)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-stone-200 leading-snug">
                            &ldquo;{sos.message}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Direct 1-tap actions right from persistent SOS banner */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isAck ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Acknowledged (adjusting)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly || !canSend}
                            onClick={() => handleAcknowledgeRequest(sos._id)}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition-all disabled:opacity-40 min-h-[40px]"
                          >
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} strokeWidth={2} />
                            )}
                            <span>Acknowledge</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy || isReadOnly || !canSend}
                          onClick={() => handleResolveRequest(sos._id)}
                          className="flex items-center gap-1.5 rounded-xl bg-[#4cc38a] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#3fb07c] transition-all disabled:opacity-40 min-h-[40px]"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} strokeWidth={2} />
                          )}
                          <span>Resolve SOS</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Global Error Toast */}
        {queueError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/50 p-3 text-xs text-red-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} strokeWidth={1.5} className="text-red-400" />
              <span>{queueError}</span>
            </div>
            <button
              onClick={() => setQueueError(null)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Minimal Overview Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 text-xs text-stone-300">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Queue: <strong className="text-white font-mono">{openRequests.length}</strong> active
            </span>
            <span className="text-stone-500">•</span>
            <span>
              Stage: <strong className="text-white font-mono">{approvedParticipants.length}</strong> / {maxCapacity}
            </span>
            {pendingParticipants.length > 0 && (
              <>
                <span className="text-stone-500">•</span>
                <span className="text-[#FF7145] font-semibold">
                  {pendingParticipants.length} waiting to join
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PushAlertToggle roomId={roomId} hostToken={hostToken} compact />
            <PipAlertButton
              openCount={openRequests.length}
              hasSos={urgentSosRequests.length > 0}
              roomCode={room.code}
            />
          </div>
        </div>

        {/* iPad Landscape 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column (2 spans): Live Request Queue & Join Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* LIVE SOUND REQUEST QUEUE */}
            <section
              aria-label="Sound Request Queue"
              className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-xl"
            >
              {/* Queue Header with Tabs and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-md shadow-[#FC3B00]/10">
                    <Volume2 size={16} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                    Live Sound Request Queue
                  </h3>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-mono font-bold text-[#FF7145]">
                    {filteredRequests.length}
                  </span>
                </div>

                {/* Minimal Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(
                    [
                      { id: "open" as const, label: "Open", count: openRequests.length },
                      { id: "acknowledged" as const, label: "In Progress", count: acknowledgedRequests.length },
                      { id: "resolved" as const, label: "Resolved", count: resolvedRequests.length },
                      { id: "all" as const, label: "All", count: allRequests.length },
                    ]
                  ).map((tab) => {
                    const isActive = requestFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRequestFilter(tab.id as RequestFilter)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "bg-gradient-to-r from-[#FC3B00] to-[#FF6129] text-white shadow-md shadow-[#FC3B00]/25"
                            : "border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] font-mono ${isActive ? "text-white/90 font-bold" : "text-stone-400"}`}>
                          ({tab.count})
                        </span>
                      </button>
                    );
                  })}
                  {urgentSosRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRequestFilter("sos")}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                        requestFilter === "sos"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "bg-red-950/60 text-red-400 border border-red-500/40"
                      }`}
                    >
                      <span>SOS</span>
                      <span>({urgentSosRequests.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Optional Search Input */}
              {allRequests.length > 5 && (
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by musician, instrument, or message..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-stone-500 focus:border-[#FC3B00] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Requests List */}
              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[#FF7145]">
                    {requestFilter === "sos" ? (
                      <CheckCircle2 size={24} strokeWidth={1.5} className="text-[#4cc38a]" />
                    ) : (
                      <Volume2 size={24} strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="text-sm font-bold text-white tracking-tight">
                    {requestFilter === "open"
                      ? "All stage requests resolved"
                      : requestFilter === "sos"
                      ? "No active SOS alerts"
                      : requestFilter === "pending"
                      ? "No unacknowledged cues"
                      : requestFilter === "acknowledged"
                      ? "No cues currently in progress"
                      : requestFilter === "resolved"
                      ? "No resolved cues yet"
                      : "No cues found"}
                  </p>
                  <p className="mt-1 max-w-sm mx-auto text-xs text-stone-400">
                    {requestFilter === "open"
                      ? "When musicians tap preset buttons or submit custom cues on their phones, they appear here instantly."
                      : "Monitor mix cues appear here in real time without refreshing."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredRequests.map((r) => {
                    const isBusy = requestBusyId === r._id;
                    const isUrgent = r.priority === "urgent";
                    const isPending = r.status === "pending";
                    const isAcknowledged = r.status === "acknowledged";
                    const isResolved = r.status === "resolved";

                    // Highlight cards newly arrived in last 10 seconds
                    const isRecent = currentTime - r.createdAt < 10_000;

                    return (
                      <div
                        key={r._id}
                        className={`rounded-xl border p-3.5 transition-all backdrop-blur-md ${
                          isUrgent && !isResolved
                            ? "border-[#FC3B00]/60 bg-red-950/40 shadow-lg shadow-[#FC3B00]/15"
                            : isRecent
                            ? "border-[#FF6129]/40 bg-black/70"
                            : "border-white/10 bg-black/60 hover:border-white/20"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Musician Identity, Instrument & Relative Time */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                                isUrgent && !isResolved
                                  ? "bg-gradient-to-br from-[#FC3B00] to-red-700 text-white shadow-md shadow-[#FC3B00]/30"
                                  : isAcknowledged
                                  ? "bg-[#FC3B00]/15 text-[#FC3B00] border border-[#FC3B00]/30"
                                  : isResolved
                                  ? "bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30"
                                  : "bg-white/5 text-white border border-white/10"
                              }`}
                            >
                              {isUrgent && !isResolved
                                ? "SOS"
                                : r.musicianName.charAt(0).toUpperCase()}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {r.musicianName}
                                </span>
                                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#FF7145]">
                                  {r.instrument}
                                </span>

                                {/* Category Badge */}
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium ${
                                    isUrgent
                                      ? "bg-red-950/60 text-red-400 border border-red-500/30"
                                      : "bg-white/5 text-stone-300 border border-white/10"
                                  }`}
                                >
                                  {r.category}
                                </span>

                                {/* Priority Badge if urgent */}
                                {isUrgent && (
                                  <span className="rounded-full bg-[#FC3B00] px-2 py-0.5 text-[9px] font-mono font-bold text-white uppercase shadow-sm shadow-[#FC3B00]/30">
                                    Urgent
                                  </span>
                                )}
                              </div>

                              {/* Request Message */}
                              <p className="text-xs font-medium text-stone-200 leading-relaxed">
                                {r.message}
                              </p>

                              {/* Timestamps & Lifecycle */}
                              <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} strokeWidth={1.5} className="text-stone-500" />
                                  {formatRelativeTime(r.createdAt, currentTime)}
                                </span>

                                {r.acknowledgedAt && (
                                  <span>
                                    Ack: {new Date(r.acknowledgedAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                )}

                                {r.resolvedAt && (
                                  <span className="text-[#4cc38a] font-semibold">
                                    Resolved in {formatDuration(r.createdAt, r.resolvedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status Pill & One-Tap Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                            {/* Current Status Pill */}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-xs font-mono text-amber-300 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending
                              </span>
                            )}

                            {isAcknowledged && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FC3B00]/30 bg-[#FC3B00]/10 px-2.5 py-1 text-xs font-mono text-[#FF7145] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FC3B00]" />
                                Adjusting mix
                              </span>
                            )}

                            {isResolved && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-xs font-mono text-emerald-400 font-semibold">
                                <CheckCircle size={13} strokeWidth={2} />
                                Resolved
                              </span>
                            )}

                            {/* One-Tap Transition Controls */}
                            {!isReadOnly && !isResolved && (
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <button
                                    type="button"
                                    disabled={isBusy || !canSend}
                                    onClick={() => handleAcknowledgeRequest(r._id)}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 hover:from-[#E03500] hover:to-[#F2551D] transition-all disabled:opacity-40 min-h-[38px]"
                                    title="Acknowledge request: lets musician know FOH is adjusting"
                                  >
                                    {isBusy ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Check size={13} strokeWidth={2} />
                                    )}
                                    <span>Acknowledge</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBusy || !canSend}
                                  onClick={() => handleResolveRequest(r._id)}
                                  className="flex items-center gap-1.5 rounded-xl bg-[#4cc38a] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#3fb07c] transition-all disabled:opacity-40 min-h-[38px]"
                                  title="Mark request resolved"
                                >
                                  {isBusy ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} strokeWidth={2} />
                                  )}
                                  <span>Resolve</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* LIVE Musician Approval Queue */}
            <section
              aria-label="Musician Join Queue"
              className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-[#FF7145] border border-white/10">
                    <Users size={16} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Musician Approval Queue
                  </h3>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-mono font-bold text-[#FF7145]">
                    {pendingParticipants.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  Live reactive queue
                </span>
              </div>

              {/* Room Full Warning in Queue */}
              {isRoomFull && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={15} strokeWidth={2} className="shrink-0 text-amber-400" />
                  <span>
                    <strong>Room Full:</strong> Maximum capacity of {maxCapacity} approved musicians reached.
                  </span>
                </div>
              )}

              {/* Pending Queue List */}
              {pendingParticipants.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs font-semibold text-stone-300">
                    No musicians waiting in queue
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    When musicians scan the QR code or enter code <span className="font-mono text-[#FF7145] font-bold">{room.code}</span>, their join requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingParticipants.map((p) => {
                    const isBusy = actionBusyId === p._id;
                    return (
                      <div
                        key={p._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md p-3.5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white font-mono font-bold text-xs">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{p.name}</span>
                              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#FF7145]">
                                {p.instrument}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Clock size={11} strokeWidth={1.5} /> Joined{" "}
                              {new Date(p.joinedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Approve & Reject Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly || isRoomFull}
                            onClick={() => handleApprove(p._id)}
                            className="flex items-center gap-1.5 rounded-xl bg-[#4cc38a] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#3fb07c] transition-colors disabled:opacity-40 min-h-[36px]"
                            title={isRoomFull ? "Capacity limit reached" : "Approve musician"}
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <UserCheck size={13} strokeWidth={2} />
                            )}
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleReject(p._id)}
                            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-40 min-h-[36px]"
                          >
                            <UserX size={13} strokeWidth={2} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column (1 span): Approved Stage Roster & Invitation Card */}
          <div className="space-y-6">
            {/* Approved Stage Roster */}
            <section
              aria-label="Approved Stage Roster"
              className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 size={16} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Approved Stage Roster
                  </h3>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300">
                    {approvedParticipants.length} / {maxCapacity}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  Presence live
                </span>
              </div>

              {approvedParticipants.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs font-semibold text-stone-300">
                    No approved musicians on stage yet
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    Musicians approved from the queue appear here with live online status indicators.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {approvedParticipants.map((p) => {
                    const isBusy = actionBusyId === p._id;
                    const isOnline = currentTime - p.lastSeenAt < 75_000;
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 backdrop-blur-md p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              isOnline ? "bg-emerald-400 animate-pulse" : "bg-stone-500"
                            }`}
                            title={isOnline ? "Online on stage" : "Offline / inactive"}
                          />
                          <div>
                            <div className="text-sm font-bold text-white leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#FF7145] font-mono font-semibold">
                              {p.instrument}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                            {isOnline ? "Online" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleRemove(p._id)}
                            className="rounded-lg p-1.5 text-stone-400 hover:text-red-400 hover:bg-white/5 transition"
                            title="Remove musician from stage session"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Minimal Stage Access Card */}
            <section
              aria-label="Stage Access"
              className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-stone-400 block uppercase font-bold tracking-wider">
                    Stage room code
                  </span>
                  <div className="font-mono text-2xl font-bold tracking-wider text-[#FF7145] mt-0.5">
                    {room.code}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                    title="Copy join link to clipboard"
                  >
                    {copiedLink ? <Check size={12} className="text-[#4cc38a]" /> : <Copy size={12} strokeWidth={1.5} />}
                    <span>{copiedLink ? "Copied" : "Link"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition"
                    title="Open Fullscreen QR Invitation"
                  >
                    <QrCode size={13} strokeWidth={2} />
                    <span>QR Code</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Fullscreen QR Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        joinUrl={joinUrl}
        roomCode={room.code}
        roomName={room.name}
      />

      {/* End Room Confirmation Dialog */}
      {isEndModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0d0c0e] p-6 text-white text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-red-950 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/20">
              <PowerOff size={26} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">End Stage Session?</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Ending this room will disconnect all musician devices and prevent any new sound requests. Service history and event logs will remain preserved.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={endingRoom}
                onClick={() => setIsEndModalOpen(false)}
                className="h-11 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={endingRoom}
                onClick={handleConfirmEndRoom}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] text-xs font-bold text-white shadow-lg shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition disabled:opacity-50"
              >
                {endingRoom ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <span>Confirm and End</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
