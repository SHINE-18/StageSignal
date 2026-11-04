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
  Download,
  Maximize2,
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
  Flame,
  ArrowUpRight,
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
        <div className="grid min-h-screen place-items-center bg-[#FAF8F5] text-stone-900">
          <Loader2 className="animate-spin text-[#EA580C]" size={32} />
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
            dark: "#1C1917",
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

  function handleDownloadQr() {
    if (!qrCanvasRef.current || !room?.code) return;
    const dataUrl = qrCanvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `StageSignal-${room.code}-QR.png`;
    link.href = dataUrl;
    link.click();
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
      const msg = err instanceof Error ? err.message : "Unable to approve participant.";
      setQueueError(msg.replace(/^Error:\s*/, ""));
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
      const msg = err instanceof Error ? err.message : "Unable to reject participant.";
      setQueueError(msg.replace(/^Error:\s*/, ""));
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
      const msg = err instanceof Error ? err.message : "Unable to remove participant.";
      setQueueError(msg.replace(/^Error:\s*/, ""));
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
      const msg = err instanceof Error ? err.message : "Failed to acknowledge request.";
      setQueueError(msg.replace(/^Error:\s*/, ""));
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
      const msg = err instanceof Error ? err.message : "Failed to resolve request.";
      setQueueError(msg.replace(/^Error:\s*/, ""));
    } finally {
      setRequestBusyId(null);
    }
  }

  // 1. Loading state while checking localStorage credentials or awaiting Convex query
  if (!hasCheckedToken || (hostToken && room === undefined)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] text-stone-900 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#EA580C] border border-orange-500/30 shadow-lg shadow-orange-500/10">
            <Radio size={24} className="animate-spin text-[#EA580C]" />
          </div>
          <h2 className="text-lg font-bold">Connecting to FOH Console...</h2>
          <p className="text-xs text-stone-500 font-mono">
            Verifying cryptographic host credentials for Room ID: {roomId}
          </p>
        </div>
      </main>
    );
  }

  // 2. Access Denied: Missing or Invalid Host Token
  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-5 text-stone-900">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-500/30">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900">Access Denied</h1>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            {!hostToken
              ? "Host session credentials were not found on this device. You can only manage this FOH console from the browser where the room was created."
              : "Invalid host session token. The cryptographic credentials presented do not match this stage room's host key."}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/create-room"
              className="rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#DC143C]/20 hover:from-[#B80F32] hover:to-[#C2410C] transition"
            >
              Create New Stage Room
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-sm font-semibold text-stone-600 hover:bg-white/10 hover:text-stone-900 transition"
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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col no-overscroll selection:bg-[#DC143C]/30">
      <OfflineBanner role="foh" />

      {/* Console Top Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FAF8F5]/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Brand & Room Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#EA580C] border border-orange-500/30">
              <Radio size={20} className={isReadOnly ? "text-stone-400" : "animate-pulse"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                  {room.name}
                </span>
                <span className="rounded-md border border-orange-500/20 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                  {room.sessionType}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-600">FOH Console</span>
                <span>•</span>
                <span>Max {maxCapacity} musicians</span>
              </div>
            </div>
          </div>

          {/* Center: Monospace Room Code & Copy */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 hidden sm:inline">
                Code
              </span>
              <span className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-[#EA580C]">
                {room.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="ml-1 rounded-lg p-1 text-stone-500 hover:bg-white/10 hover:text-stone-900 transition"
              >
                {copiedCode ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Right: Clock & Room Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LiveClock />

            {/* Picture-in-Picture Floating Alert Badge (Experimental) */}
            <PipAlertButton
              openCount={openRequests.length}
              hasSos={urgentSosRequests.length > 0}
              roomCode={room.code}
            />

            {/* Web Push Background Alerts Toggle */}
            <PushAlertToggle roomId={roomId} hostToken={hostToken} />

            {/* Compact Mini-Console View Toggle */}
            <button
              type="button"
              onClick={() => setIsCompactView(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-orange-500/40 hover:text-stone-900 transition active:scale-95"
              title="Switch to Compact Mini-Console (optimized for iPad Slide Over / Split View)"
            >
              <Minimize2 size={14} className="text-[#EA580C]" />
              <span className="hidden lg:inline">Compact View</span>
            </button>

            {/* Service History Link */}
            <Link
              href={`/room/${roomId}/history`}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-orange-500/40 hover:text-stone-900 transition active:scale-95"
              title="View Service History & Audit"
            >
              <History size={14} className="text-[#EA580C]" />
              <span className="hidden md:inline">History</span>
            </Link>

            {/* Active / Ended Status Badge */}
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>{isRoomEnded ? "ENDED" : "EXPIRED"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">LIVE ACTIVE</span>
                <span className="sm:hidden">LIVE</span>
              </span>
            )}

            {/* End Room CTA */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/50 hover:text-red-300 transition active:scale-95"
              >
                <PowerOff size={14} />
                <span className="hidden md:inline">End Session</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Console Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Read-Only Alert Banner if Ended/Expired */}
        {isReadOnly && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-200 flex items-start gap-3">
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

        {/* PERSISTENT URGENT SOS ALERT BANNER (PRD Section 6.2 & 12.5) */}
        {urgentSosRequests.length > 0 && (
          <section
            aria-label="Urgent SOS Alerts"
            className="rounded-2xl border-2 border-red-500 bg-red-950/70 p-4 sm:p-5 shadow-2xl shadow-red-900/40 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-red-100 flex items-center gap-1.5">
                      <Flame size={18} className="text-red-400 animate-bounce" />
                      Urgent SOS Active
                    </h2>
                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-mono font-bold text-stone-900 shadow-sm">
                      {urgentSosRequests.length} {urgentSosRequests.length === 1 ? "Alert" : "Alerts"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-red-300/80 hidden sm:inline">
                  Visual-Only Alert • Persistent until resolved
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-white/90 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DC143C] text-white font-extrabold shadow-sm">
                          SOS
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-stone-900">
                              {sos.musicianName}
                            </span>
                            <span className="rounded-md border border-red-500/40 bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase">
                              {sos.instrument}
                            </span>
                            <span className="text-[11px] text-red-300/80 font-mono">
                              • {formatRelativeTime(sos.createdAt, currentTime)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-red-100 font-medium leading-snug">
                            &ldquo;{sos.message}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Direct 1-tap actions right from persistent SOS banner */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isAck ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/40 bg-orange-950/70 px-3.5 py-2 text-xs font-bold text-[#EA580C] shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-[#FFA726] animate-pulse" />
                            <span>Acknowledged (FOH Adjusting)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly || !canSend}
                            onClick={() => handleAcknowledgeRequest(sos._id)}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-[#B80F32] hover:to-[#C2410C] transition active:scale-95 disabled:opacity-40 min-h-[44px]"
                          >
                            {isBusy ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            <span>Acknowledge</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy || isReadOnly || !canSend}
                          onClick={() => handleResolveRequest(sos._id)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition active:scale-95 disabled:opacity-40 min-h-[44px]"
                        >
                          {isBusy ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{queueError}</span>
            </div>
            <button
              onClick={() => setQueueError(null)}
              className="text-red-400 hover:text-stone-900"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Statistics Bar (PRD Section 6.2) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-stone-100 bg-white p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Stage Roster
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-extrabold ${
                  isRoomFull ? "text-[#EA580C]" : "text-emerald-400"
                }`}
              >
                {approvedParticipants.length}
              </span>
              <span className="text-xs text-stone-400">/ {maxCapacity}</span>
            </div>
            <span className="mt-1 block text-[10px] text-stone-400">
              {isRoomFull ? "At capacity limit" : "Approved musicians"}
            </span>
          </div>

          <div className="rounded-xl border border-stone-100 bg-white p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Join Queue
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-extrabold text-[#EA580C]">
                {pendingParticipants.length}
              </span>
              <span className="text-xs text-stone-400">waiting</span>
            </div>
            <span className="mt-1 block text-[10px] text-stone-400">
              Awaiting FOH approval
            </span>
          </div>

          <div className="rounded-xl border border-stone-100 bg-white p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Open Requests
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-extrabold ${
                  openRequests.length > 0 ? "text-[#EA580C]" : "text-stone-900"
                }`}
              >
                {openRequests.length}
              </span>
              <span className="text-xs text-stone-400">active</span>
            </div>
            <span className="mt-1 block text-[10px] text-stone-400">
              Pending + in progress
            </span>
          </div>

          <div
            className={`rounded-xl border p-3.5 transition ${
              urgentSosRequests.length > 0
                ? "border-red-500/50 bg-red-950/40"
                : "border-stone-100 bg-white"
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              SOS Alerts
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-2xl font-extrabold ${
                  urgentSosRequests.length > 0 ? "text-[#FF6B81] animate-pulse" : "text-stone-500"
                }`}
              >
                {urgentSosRequests.length}
              </span>
              <span className="text-xs text-stone-400">urgent</span>
            </div>
            <span className="mt-1 block text-[10px] text-stone-400">
              {urgentSosRequests.length > 0 ? "Requires immediate FOH attention" : "All clear"}
            </span>
          </div>
        </div>

        {/* iPad Landscape 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column (2 spans): Live Request Queue & Join Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* LIVE SOUND REQUEST QUEUE (PRD Section 6.2 & Phase 5 Core) */}
            <section
              aria-label="Sound Request Queue"
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
            >
              {/* Queue Header with Tabs and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <Volume2 size={20} className="text-[#EA580C]" />
                  <h3 className="font-extrabold text-stone-900 text-base">
                    Live Sound Request Queue
                  </h3>
                  <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#EA580C] border border-orange-500/30">
                    {filteredRequests.length}
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(
                    [
                      { id: "open" as const, label: "Open", count: openRequests.length, isSos: false },
                      { id: "sos" as const, label: "SOS", count: urgentSosRequests.length, isSos: true },
                      { id: "pending" as const, label: "Pending", count: pendingRequests.length, isSos: false },
                      { id: "acknowledged" as const, label: "In Progress", count: acknowledgedRequests.length, isSos: false },
                      { id: "resolved" as const, label: "Resolved", count: resolvedRequests.length, isSos: false },
                      { id: "all" as const, label: "All", count: allRequests.length, isSos: false },
                    ]
                  ).map((tab) => {
                    const isActive = requestFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRequestFilter(tab.id as RequestFilter)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                          isActive
                            ? tab.isSos && tab.count > 0
                              ? "bg-[#DC143C] text-white font-bold"
                              : "bg-gradient-to-r from-[#DC143C] to-[#EA580C] text-stone-900 font-bold"
                            : tab.isSos && tab.count > 0
                            ? "bg-red-950/50 text-red-300 border border-red-500/30 hover:bg-red-900/40"
                            : "bg-stone-50 text-stone-600 hover:bg-white/10 hover:text-stone-900"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                            isActive
                              ? "bg-white/20 text-stone-900"
                              : "bg-white/5 text-stone-500"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
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
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Requests List */}
              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-stone-400">
                    {requestFilter === "sos" ? (
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    ) : (
                      <Volume2 size={24} />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-stone-600">
                    {requestFilter === "open"
                      ? "All stage requests resolved"
                      : requestFilter === "sos"
                      ? "No active SOS alerts"
                      : requestFilter === "pending"
                      ? "No unacknowledged requests"
                      : requestFilter === "acknowledged"
                      ? "No requests currently in progress"
                      : requestFilter === "resolved"
                      ? "No resolved requests yet"
                      : "No requests found"}
                  </p>
                  <p className="mt-1 max-w-sm mx-auto text-xs text-stone-400">
                    {requestFilter === "open"
                      ? "When musicians tap preset buttons or submit custom cues on their phones, they appear here instantly."
                      : "Monitor mix requests will appear here in real time without refreshing."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                        className={`rounded-xl border p-4 transition duration-200 ${
                          isUrgent && !isResolved
                            ? "border-red-500/60 bg-red-950/25 shadow-lg shadow-red-950/30"
                            : isRecent
                            ? "border-orange-500/50 bg-stone-50 ring-1 ring-orange-500/30"
                            : "border-stone-200 bg-stone-50 hover:border-orange-500/30"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Musician Identity, Instrument & Relative Time */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                                isUrgent && !isResolved
                                  ? "bg-[#DC143C] text-white"
                                  : isAcknowledged
                                  ? "bg-orange-500/15 text-[#EA580C] border border-orange-500/30"
                                  : isResolved
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {isUrgent && !isResolved
                                ? "SOS"
                                : r.musicianName.charAt(0).toUpperCase()}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                                  {r.musicianName}
                                </span>
                                <span className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                                  {r.instrument}
                                </span>

                                {/* Category Badge */}
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    isUrgent
                                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                      : "bg-orange-500/10 text-[#EA580C] border border-orange-500/20"
                                  }`}
                                >
                                  {r.category}
                                </span>

                                {/* Priority Badge if urgent */}
                                {isUrgent && (
                                  <span className="rounded-md bg-[#DC143C] px-1.5 py-0.5 text-[9px] font-black text-stone-900 uppercase tracking-wider">
                                    Urgent
                                  </span>
                                )}
                              </div>

                              {/* Request Message */}
                              <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed">
                                {r.message}
                              </p>

                              {/* Timestamps & Lifecycle */}
                              <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-stone-400" />
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
                                  <span className="text-emerald-400 font-semibold">
                                    Resolved in {formatDuration(r.createdAt, r.resolvedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status Pill & One-Tap Action Buttons */}
                          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                            {/* Current Status Pill */}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending
                              </span>
                            )}

                            {isAcknowledged && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#EA580C]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#FFA726] animate-pulse" />
                                Adjusting Mix
                              </span>
                            )}

                            {isResolved && (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle size={13} />
                                Resolved
                              </span>
                            )}

                            {/* One-Tap Transition Controls (min-h-[44px] touch target for iPad) */}
                            {!isReadOnly && !isResolved && (
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <button
                                    type="button"
                                    disabled={isBusy || !canSend}
                                    onClick={() => handleAcknowledgeRequest(r._id)}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:from-[#B80F32] hover:to-[#C2410C] transition active:scale-95 disabled:opacity-40 min-h-[44px]"
                                    title="Acknowledge request: lets musician know FOH is adjusting"
                                  >
                                    {isBusy ? (
                                      <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                      <Check size={15} />
                                    )}
                                    <span>Acknowledge</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBusy || !canSend}
                                  onClick={() => handleResolveRequest(r._id)}
                                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95 disabled:opacity-40 min-h-[44px]"
                                  title="Mark request resolved"
                                >
                                  {isBusy ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={15} />
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

            {/* LIVE Musician Approval Queue (PRD Section 4.3 & 6.2) */}
            <section
              aria-label="Musician Join Queue"
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#EA580C]" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    Musician Approval Queue
                  </h3>
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-mono font-bold text-[#EA580C] border border-orange-500/30">
                    {pendingParticipants.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-500">
                  Live reactive queue
                </span>
              </div>

              {/* Room Full Warning in Queue */}
              {isRoomFull && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  <span>
                    <strong>Room Full:</strong> Maximum capacity of {maxCapacity} approved musicians reached. Approvals are blocked until a musician is removed.
                  </span>
                </div>
              )}

              {/* Pending Queue List */}
              {pendingParticipants.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-stone-400">
                    <Users size={20} />
                  </div>
                  <p className="text-xs font-semibold text-stone-500">
                    No musicians waiting in queue
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    When musicians scan the QR code or enter code <span className="font-mono text-[#EA580C]">{room.code}</span>, their join requests will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingParticipants.map((p) => {
                    const isBusy = actionBusyId === p._id;
                    return (
                      <div
                        key={p._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 transition hover:border-orange-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-[#EA580C] border border-orange-500/20 font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-900">{p.name}</span>
                              <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-[#EA580C]">
                                {p.instrument}
                              </span>
                            </div>
                            <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> Joined{" "}
                              {new Date(p.joinedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
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
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
                            title={isRoomFull ? "Capacity limit reached" : "Approve musician"}
                          >
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleReject(p._id)}
                            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/50 transition active:scale-95 disabled:opacity-40 min-h-[40px]"
                          >
                            <UserX size={14} />
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
            {/* LIVE Approved Stage Roster with Online Presence */}
            <section
              aria-label="Approved Stage Roster"
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    Approved Stage Roster
                  </h3>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                    {approvedParticipants.length} / {maxCapacity}
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 font-mono">
                  Presence live
                </span>
              </div>

              {approvedParticipants.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs font-semibold text-stone-500">
                    No approved musicians on stage yet
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    Musicians approved from the queue will appear here with live online status indicators.
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
                        className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 transition hover:border-orange-500/30"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Live Presence Dot — Calculated dynamically against client clock */}
                          <div
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              isOnline
                                ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-500/30"
                                : "bg-slate-600"
                            }`}
                            title={isOnline ? "Online on stage" : "Offline / inactive"}
                          />
                          <div>
                            <div className="text-sm font-bold text-stone-900 leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#EA580C] font-medium">
                              {p.instrument}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                            {isOnline ? "Online" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleRemove(p._id)}
                            className="rounded-lg p-1.5 text-stone-500 hover:bg-red-950/50 hover:text-red-400 transition"
                            title="Remove musician from stage session"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* QR Invitation Card */}
            <section
              aria-label="Stage Invitation"
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-[#EA580C]" />
                  <h3 className="font-bold text-stone-900 text-sm">Stage Invitation</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#EA580C] hover:text-orange-300 transition"
                >
                  <Maximize2 size={12} />
                  <span>Fullscreen</span>
                </button>
              </div>

              {/* QR Code Canvas */}
              <div className="mt-5 flex flex-col items-center">
                <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-md">
                  <canvas ref={qrCanvasRef} className="rounded-md" />
                </div>

                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Room Code
                  </span>
                  <div className="font-mono text-2xl font-extrabold tracking-widest text-[#EA580C]">
                    {room.code}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-800 hover:bg-white/10 transition active:scale-95"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-800 hover:bg-white/10 transition active:scale-95"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>

              <div className="mt-3 rounded-lg bg-stone-50/60 p-2.5 text-[11px] text-stone-500 font-mono break-all border border-stone-100">
                {joinUrl}
              </div>
            </section>

            {/* Room Metadata & Security Overview */}
            <section
              aria-label="Session Metadata"
              className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Session Information
                </h4>
                <Link
                  href={`/room/${roomId}/history`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] hover:text-orange-300 transition"
                >
                  <span>Audit History</span>
                  <ArrowUpRight size={12} />
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Session Type</span>
                  <span className="font-semibold text-stone-900 capitalize">{room.sessionType}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Capacity Limit</span>
                  <span className="font-semibold text-[#EA580C] font-mono">
                    {maxCapacity} Approved Musicians
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Room Status</span>
                  <span className="font-semibold uppercase text-emerald-400">
                    {room.status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Duration Limit</span>
                  <span className="text-stone-600">12 Hours (Auto-expiry)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-500">Expires At</span>
                  <span className="font-mono text-stone-600">
                    {new Date(room.expiresAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-[11px] text-stone-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#EA580C] shrink-0 mt-0.5" />
                <span>
                  Host token verified. Only this device holds the cryptographic authorization to approve musicians, resolve cues, and manage this stage session.
                </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 rounded-3xl text-stone-900 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/60 text-red-400 border border-red-500/30">
              <PowerOff size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-stone-900">End Stage Session?</h3>
            <p className="mt-2 text-xs text-stone-600 text-center leading-relaxed">
              Ending this room will disconnect all musician devices and prevent any new sound requests. Service history and event logs will remain preserved.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={endingRoom}
                onClick={() => setIsEndModalOpen(false)}
                className="rounded-xl border border-stone-200 bg-stone-50 py-3 text-xs font-semibold text-stone-600 hover:bg-white/10 hover:text-stone-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={endingRoom}
                onClick={handleConfirmEndRoom}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] py-3 text-xs font-bold text-white shadow-md shadow-[#DC143C]/30 hover:from-[#B80F32] hover:to-[#C2410C] transition disabled:opacity-50"
              >
                {endingRoom ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <span>Confirm & End</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
