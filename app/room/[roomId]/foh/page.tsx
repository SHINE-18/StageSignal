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
        <div className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed]">
          <Loader2 className="animate-spin text-[#fc3b00]" size={24} />
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
      <main className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#19191b] border border-white/[0.08] text-[#fc3b00]">
            <Radio size={20} className="animate-spin text-[#fc3b00]" />
          </div>
          <h2 className="text-base font-semibold">Connecting to FOH console...</h2>
          <p className="text-xs text-[#85858b] font-mono">
            Verifying cryptographic host credentials for room ID: {roomId}
          </p>
        </div>
      </main>
    );
  }

  // 2. Access Denied: Missing or Invalid Host Token
  if (!hostToken || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-5 text-[#ededed]">
        <div className="w-full max-w-md rounded-xl border border-[#e5484d]/30 bg-[#19191b] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#2b1718] text-[#e5484d] border border-[#e5484d]/30">
            <ShieldAlert size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-[#ededed]">Access denied</h1>
          <p className="mt-2 text-xs text-[#a1a1a6] leading-relaxed">
            {!hostToken
              ? "Host session credentials were not found on this device. You can only manage this FOH console from the browser where the room was created."
              : "Invalid host session token. The cryptographic credentials presented do not match this stage room's host key."}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/create-room"
              className="h-10 flex items-center justify-center rounded-lg bg-[#fc3b00] text-xs font-medium text-white hover:bg-[#e03500] transition-colors"
            >
              Create new stage room
            </Link>
            <Link
              href="/"
              className="h-10 flex items-center justify-center rounded-lg border border-white/[0.08] bg-[#232325] text-xs font-medium text-[#ededed] hover:bg-[#2b2b2e] transition-colors"
            >
              Return home
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
    <div className="min-h-screen bg-[#141415] text-[#ededed] flex flex-col no-overscroll selection:bg-[#fc3b00] selection:text-white">
      <OfflineBanner role="foh" />

      {/* Console Top Header — Minimal & Sleek */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0f0f10] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Brand & Room Info with 1-Tap Copy Pill */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group" title="Return to Overview">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#19191b] border border-white/[0.08] text-[#fc3b00]">
                <Radio size={16} strokeWidth={1.5} />
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm sm:text-base font-semibold text-[#ededed]">
                  {room.name}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Click to copy room code"
                  className="inline-flex items-center gap-1.5 rounded border border-white/[0.08] bg-[#19191b] px-2 py-0.5 text-xs text-[#a1a1a6] hover:bg-[#232325] transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4cc38a]" />
                  <span className="font-mono text-[11px] text-[#ededed]">{room.code}</span>
                  {copiedCode ? <Check size={11} className="text-[#4cc38a]" /> : <Copy size={11} className="text-[#85858b]" />}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#19191b] px-2.5 py-1 text-xs font-medium text-[#ededed] hover:bg-[#232325] transition-colors"
              title="Musician QR Invitation"
            >
              <QrCode size={13} strokeWidth={1.5} className="text-[#fc3b00]" />
              <span className="hidden sm:inline">QR invite</span>
            </button>

            {/* Compact Mini-Console View Toggle */}
            <button
              type="button"
              onClick={() => setIsCompactView(true)}
              className="p-1.5 rounded-lg text-[#85858b] hover:text-[#ededed] hover:bg-[#19191b] transition-colors"
              title="Compact View"
            >
              <Minimize2 size={16} strokeWidth={1.5} />
            </button>

            {/* Service History Link */}
            <Link
              href={`/room/${roomId}/history`}
              className="p-1.5 rounded-lg text-[#85858b] hover:text-[#ededed] hover:bg-[#19191b] transition-colors"
              title="Service History"
            >
              <History size={16} strokeWidth={1.5} />
            </Link>

            {/* End Room CTA */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsEndModalOpen(true)}
                className="rounded-lg border border-[#e5484d]/30 bg-[#2b1718] px-2.5 py-1 text-xs font-medium text-[#e5484d] hover:bg-[#361a1c] transition-colors"
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

        {/* PERSISTENT URGENT SOS ALERT BANNER */}
        {urgentSosRequests.length > 0 && (
          <section
            aria-label="Urgent SOS Alerts"
            className="rounded-xl border border-[#e5484d] bg-[#2b1718] p-4 text-[#ededed] shadow-sm animate-in fade-in duration-200"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5484d]" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#ededed] flex items-center gap-1.5">
                      <AlertTriangle size={16} strokeWidth={1.5} className="text-[#e5484d]" />
                      Emergency SOS active
                    </h2>
                    <span className="rounded bg-[#e5484d]/20 px-2 py-0.5 text-xs font-mono font-medium text-[#e5484d] border border-[#e5484d]/30">
                      {urgentSosRequests.length} {urgentSosRequests.length === 1 ? "alert" : "alerts"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-[#a1a1a6] hidden sm:inline">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#e5484d]/30 bg-[#19191b] p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5484d]/20 text-[#e5484d] font-mono font-semibold text-xs border border-[#e5484d]/30">
                          SOS
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#ededed]">
                              {sos.musicianName}
                            </span>
                            <span className="rounded border border-[#e5484d]/30 bg-[#2b1718] px-2 py-0.5 text-[10px] font-mono text-[#e5484d]">
                              {sos.instrument}
                            </span>
                            <span className="text-[11px] text-[#85858b] font-mono">
                              • {formatRelativeTime(sos.createdAt, currentTime)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#ededed] leading-snug">
                            &ldquo;{sos.message}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Direct 1-tap actions right from persistent SOS banner */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isAck ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1.5 text-xs font-medium text-[#f59e0b]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                            <span>Acknowledged (adjusting)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly || !canSend}
                            onClick={() => handleAcknowledgeRequest(sos._id)}
                            className="flex items-center gap-1.5 rounded-lg bg-[#fc3b00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e03500] transition-colors disabled:opacity-40 min-h-[40px]"
                          >
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} strokeWidth={1.5} />
                            )}
                            <span>Acknowledge</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy || isReadOnly || !canSend}
                          onClick={() => handleResolveRequest(sos._id)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#4cc38a] px-3 py-1.5 text-xs font-medium text-[#0f0f10] hover:bg-[#43ad7b] transition-colors disabled:opacity-40 min-h-[40px]"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} strokeWidth={1.5} />
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
          <div className="rounded-lg border border-[#e5484d]/30 bg-[#19191b] p-3 text-xs text-[#e5484d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} strokeWidth={1.5} />
              <span>{queueError}</span>
            </div>
            <button
              onClick={() => setQueueError(null)}
              className="text-[#85858b] hover:text-[#ededed] p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Minimal Overview Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3 text-xs text-[#a1a1a6]">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Queue: <strong className="text-[#ededed] font-mono">{openRequests.length}</strong> active
            </span>
            <span className="text-[#85858b]">•</span>
            <span>
              Stage: <strong className="text-[#ededed] font-mono">{approvedParticipants.length}</strong> / {maxCapacity}
            </span>
            {pendingParticipants.length > 0 && (
              <>
                <span className="text-[#85858b]">•</span>
                <span className="text-[#fc3b00] font-medium">
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
              className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-4"
            >
              {/* Queue Header with Tabs and Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <Volume2 size={18} strokeWidth={1.5} className="text-[#fc3b00]" />
                  <h3 className="font-semibold text-[#ededed] text-sm sm:text-base">
                    Live sound cue queue
                  </h3>
                  <span className="rounded border border-white/[0.08] bg-[#232325] px-2 py-0.5 text-xs font-mono text-[#a1a1a6]">
                    {filteredRequests.length}
                  </span>
                </div>

                {/* Minimal Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(
                    [
                      { id: "open" as const, label: "Open", count: openRequests.length },
                      { id: "acknowledged" as const, label: "In progress", count: acknowledgedRequests.length },
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
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-[#232325] text-[#ededed] border border-white/[0.12]"
                            : "text-[#85858b] hover:text-[#ededed] hover:bg-[#232325]/50"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className="text-[10px] font-mono opacity-60">
                          ({tab.count})
                        </span>
                      </button>
                    );
                  })}
                  {urgentSosRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRequestFilter("sos")}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        requestFilter === "sos"
                          ? "bg-[#e5484d] text-white"
                          : "bg-[#2b1718] text-[#e5484d] border border-[#e5484d]/30"
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
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f0f10] border border-white/[0.08] text-[#85858b]">
                    {requestFilter === "sos" ? (
                      <CheckCircle2 size={20} strokeWidth={1.5} className="text-[#4cc38a]" />
                    ) : (
                      <Volume2 size={20} strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#a1a1a6]">
                    {requestFilter === "open"
                      ? "All stage cues resolved"
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
                  <p className="mt-1 max-w-sm mx-auto text-xs text-[#85858b]">
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
                        className={`rounded-lg border p-3.5 transition-colors ${
                          isUrgent && !isResolved
                            ? "border-[#e5484d]/50 bg-[#2b1718]"
                            : isRecent
                            ? "border-[#fc3b00]/40 bg-[#0f0f10]"
                            : "border-white/[0.06] bg-[#0f0f10] hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Musician Identity, Instrument & Relative Time */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold ${
                                isUrgent && !isResolved
                                  ? "bg-[#e5484d] text-white"
                                  : isAcknowledged
                                  ? "bg-[#fc3b00]/15 text-[#fc3b00] border border-[#fc3b00]/30"
                                  : isResolved
                                  ? "bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30"
                                  : "bg-[#232325] text-[#ededed] border border-white/[0.08]"
                              }`}
                            >
                              {isUrgent && !isResolved
                                ? "SOS"
                                : r.musicianName.charAt(0).toUpperCase()}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-[#ededed] text-sm">
                                  {r.musicianName}
                                </span>
                                <span className="rounded border border-white/[0.08] bg-[#19191b] px-2 py-0.5 text-[10px] font-mono text-[#a1a1a6]">
                                  {r.instrument}
                                </span>

                                {/* Category Badge */}
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-mono ${
                                    isUrgent
                                      ? "bg-[#e5484d]/20 text-[#e5484d] border border-[#e5484d]/30"
                                      : "bg-[#232325] text-[#fc3b00] border border-white/[0.08]"
                                  }`}
                                >
                                  {r.category}
                                </span>

                                {/* Priority Badge if urgent */}
                                {isUrgent && (
                                  <span className="rounded bg-[#e5484d] px-1.5 py-0.5 text-[9px] font-mono font-medium text-white uppercase">
                                    Urgent
                                  </span>
                                )}
                              </div>

                              {/* Request Message */}
                              <p className="text-xs text-[#ededed] leading-relaxed">
                                {r.message}
                              </p>

                              {/* Timestamps & Lifecycle */}
                              <div className="flex items-center gap-3 text-[11px] text-[#85858b] font-mono pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} strokeWidth={1.5} className="text-[#85858b]" />
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
                                  <span className="text-[#4cc38a]">
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
                              <span className="inline-flex items-center gap-1.5 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-1 text-xs font-mono text-[#f59e0b]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                                Pending
                              </span>
                            )}

                            {isAcknowledged && (
                              <span className="inline-flex items-center gap-1.5 rounded border border-[#fc3b00]/30 bg-[#fc3b00]/10 px-2.5 py-1 text-xs font-mono text-[#fc3b00]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#fc3b00]" />
                                Adjusting mix
                              </span>
                            )}

                            {isResolved && (
                              <span className="inline-flex items-center gap-1.5 rounded border border-[#4cc38a]/30 bg-[#4cc38a]/10 px-2.5 py-1 text-xs font-mono text-[#4cc38a]">
                                <CheckCircle size={13} strokeWidth={1.5} />
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
                                    className="flex items-center gap-1.5 rounded-lg bg-[#fc3b00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e03500] transition-colors disabled:opacity-40 min-h-[38px]"
                                    title="Acknowledge request: lets musician know FOH is adjusting"
                                  >
                                    {isBusy ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Check size={13} strokeWidth={1.5} />
                                    )}
                                    <span>Acknowledge</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBusy || !canSend}
                                  onClick={() => handleResolveRequest(r._id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-[#4cc38a] px-3 py-1.5 text-xs font-medium text-[#0f0f10] hover:bg-[#43ad7b] transition-colors disabled:opacity-40 min-h-[38px]"
                                  title="Mark request resolved"
                                >
                                  {isBusy ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} strokeWidth={1.5} />
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
              className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <Users size={16} strokeWidth={1.5} className="text-[#a1a1a6]" />
                  <h3 className="font-semibold text-[#ededed] text-sm">
                    Musician approval queue
                  </h3>
                  <span className="rounded border border-white/[0.08] bg-[#232325] px-2 py-0.5 text-xs font-mono text-[#a1a1a6]">
                    {pendingParticipants.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#85858b]">
                  Live queue
                </span>
              </div>

              {/* Room Full Warning in Queue */}
              {isRoomFull && (
                <div className="rounded-lg border border-[#f59e0b]/30 bg-[#19191b] p-3 text-xs text-[#f59e0b] flex items-center gap-2">
                  <AlertTriangle size={15} strokeWidth={1.5} className="shrink-0" />
                  <span>
                    <strong>Room Full:</strong> Maximum capacity of {maxCapacity} approved musicians reached.
                  </span>
                </div>
              )}

              {/* Pending Queue List */}
              {pendingParticipants.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs font-medium text-[#85858b]">
                    No musicians waiting in queue
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#85858b]">
                    When musicians scan the QR code or enter code <span className="font-mono text-[#ededed]">{room.code}</span>, their join requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingParticipants.map((p) => {
                    const isBusy = actionBusyId === p._id;
                    return (
                      <div
                        key={p._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0f0f10] p-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#232325] border border-white/[0.08] text-[#ededed] font-mono text-xs">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#ededed]">{p.name}</span>
                              <span className="rounded border border-white/[0.08] bg-[#19191b] px-2 py-0.5 text-[10px] font-mono text-[#a1a1a6]">
                                {p.instrument}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#85858b] flex items-center gap-1 mt-0.5 font-mono">
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
                            className="flex items-center gap-1.5 rounded-lg bg-[#4cc38a] px-3 py-1.5 text-xs font-medium text-[#0f0f10] hover:bg-[#43ad7b] transition-colors disabled:opacity-40 min-h-[36px]"
                            title={isRoomFull ? "Capacity limit reached" : "Approve musician"}
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <UserCheck size={13} strokeWidth={1.5} />
                            )}
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleReject(p._id)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#e5484d]/30 bg-[#2b1718] px-3 py-1.5 text-xs font-medium text-[#e5484d] hover:bg-[#361a1c] transition-colors disabled:opacity-40 min-h-[36px]"
                          >
                            <UserX size={13} strokeWidth={1.5} />
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
              className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#4cc38a]" />
                  <h3 className="font-semibold text-[#ededed] text-sm">
                    Approved stage roster
                  </h3>
                  <span className="rounded border border-white/[0.08] bg-[#232325] px-2 py-0.5 text-xs font-mono text-[#4cc38a]">
                    {approvedParticipants.length} / {maxCapacity}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#85858b]">
                  Presence live
                </span>
              </div>

              {approvedParticipants.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs font-medium text-[#85858b]">
                    No approved musicians on stage yet
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#85858b]">
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
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0f0f10] p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              isOnline ? "bg-[#4cc38a]" : "bg-[#85858b]"
                            }`}
                            title={isOnline ? "Online on stage" : "Offline / inactive"}
                          />
                          <div>
                            <div className="text-sm font-medium text-[#ededed] leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#a1a1a6] font-mono">
                              {p.instrument}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#85858b] hidden sm:inline">
                            {isOnline ? "Online" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy || isReadOnly}
                            onClick={() => handleRemove(p._id)}
                            className="rounded p-1 text-[#85858b] hover:text-[#e5484d] transition-colors"
                            title="Remove musician from stage session"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
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
              className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-[#85858b] block">
                    Musician stage code
                  </span>
                  <div className="font-mono text-xl font-semibold tracking-wider text-[#ededed] mt-0.5">
                    {room.code}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#232325] px-2.5 py-1.5 text-xs font-medium text-[#ededed] hover:bg-[#2b2b2e] transition-colors"
                    title="Copy join link to clipboard"
                  >
                    {copiedLink ? <Check size={12} className="text-[#4cc38a]" /> : <Copy size={12} strokeWidth={1.5} />}
                    <span>{copiedLink ? "Copied" : "Link"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#fc3b00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e03500] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    title="Open Fullscreen QR Invitation"
                  >
                    <QrCode size={12} strokeWidth={1.5} />
                    <span>QR code</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#19191b] p-6 text-[#ededed] text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#2b1718] text-[#e5484d] border border-[#e5484d]/30">
              <PowerOff size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#ededed]">End stage session?</h3>
            <p className="text-xs text-[#a1a1a6] leading-relaxed">
              Ending this room will disconnect all musician devices and prevent any new sound requests. Service history and event logs will remain preserved.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={endingRoom}
                onClick={() => setIsEndModalOpen(false)}
                className="h-10 rounded-lg border border-white/[0.08] bg-[#232325] text-xs font-medium text-[#ededed] hover:bg-[#2b2b2e] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={endingRoom}
                onClick={handleConfirmEndRoom}
                className="h-10 flex items-center justify-center gap-1.5 rounded-lg bg-[#e5484d] text-xs font-medium text-white hover:bg-[#d03d42] transition-colors disabled:opacity-50"
              >
                {endingRoom ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <span>Confirm and end</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
