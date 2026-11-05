"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  UserX,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getOrCreateRoomParticipantToken } from "../../../../lib/profile";
import { getParticipantToken } from "../../../../lib/tokens";

function WaitingContent() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId as any;
  const search = useSearchParams();
  const router = useRouter();

  const participantId = (search.get("participantId") || "") as any;
  const [token, setToken] = useState("");

  useEffect(() => {
    if (roomId) {
      // Check room-specific token first, fallback to participant token
      const roomToken = getOrCreateRoomParticipantToken(roomId);
      if (roomToken) {
        setToken(roomToken);
      } else if (participantId) {
        const fallback = getParticipantToken(participantId);
        if (fallback) setToken(fallback);
      }
    }
  }, [roomId, participantId]);

  // Reactive subscription to participant's live status
  const statusData = useQuery(
    api.participants.getParticipantStatus,
    token && roomId
      ? {
          roomId,
          participantToken: token,
          participantId: participantId || undefined,
        }
      : "skip"
  );

  // Auto-redirect when approved by FOH
  useEffect(() => {
    if (statusData?.state === "found" && statusData.status === "approved" && roomId) {
      const timer = setTimeout(() => {
        router.push(`/room/${roomId}/musician?participantId=${statusData.participantId}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [statusData, roomId, router]);

  // Missing session / credentials
  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-5 text-[#ededed]">
        <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#19191b] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-red-400 border border-white/[0.08]">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight">Session credentials missing</h1>
          <p className="mt-2 text-xs sm:text-sm text-[#a1a1a6] leading-relaxed">
            No active musician session token found on this device. Please join the stage room using the room code or QR code.
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-5 py-3 text-xs font-semibold text-white transition active:translate-y-px"
          >
            Go to join screen
          </Link>
        </div>
      </main>
    );
  }

  // Loading state while connecting
  if (statusData === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-5 text-[#ededed]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-[#fc3b00] border border-white/[0.08]">
            <Loader2 size={24} className="animate-spin text-[#fc3b00]" />
          </div>
          <h2 className="text-sm font-semibold text-[#ededed] tracking-tight">Connecting to stage...</h2>
          <p className="text-xs text-[#85858b] font-mono">
            Subscribing to FOH approval channel
          </p>
        </div>
      </main>
    );
  }

  // Session Not Found / Invalid Token
  if (statusData.state !== "found") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-5 text-[#ededed]">
        <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-[#19191b] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-amber-400 border border-white/[0.08]">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#ededed] tracking-tight">Session not found</h1>
          <p className="mt-2 text-xs sm:text-sm text-[#a1a1a6] leading-relaxed">
            {statusData.message || "Your stage access request was not found. Please rejoin."}
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-5 py-3 text-xs font-semibold text-white transition active:translate-y-px"
          >
            Rejoin stage room
          </Link>
        </div>
      </main>
    );
  }

  const isPending = statusData.status === "pending";
  const isApproved = statusData.status === "approved";
  const isRejected = statusData.status === "rejected";
  const isRemoved = statusData.status === "removed";
  const isEnded = statusData.roomStatus === "ended" || statusData.isExpired;

  return (
    <main className="grid min-h-screen place-items-center bg-[#141415] px-4 py-8 text-[#ededed]">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#19191b] p-6 sm:p-8 text-center">
        {/* Beacon / Status Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#232325] border border-white/[0.08]">
          {isPending && (
            <Clock size={28} className="text-[#fc3b00]" />
          )}

          {isApproved && (
            <CheckCircle2 size={32} className="text-[#4cc38a]" />
          )}

          {isRejected && (
            <XCircle size={32} className="text-[#e5484d]" />
          )}

          {isRemoved && (
            <UserX size={32} className="text-amber-400" />
          )}
        </div>

        {/* Musician Badge */}
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#232325] px-3 py-1 text-xs text-[#ededed]">
          <span className="font-semibold text-white">{statusData.name}</span>
          <span className="text-[#85858b]">•</span>
          <span className="text-[#a1a1a6]">{statusData.instrument}</span>
        </div>

        {/* Room Headline */}
        <div className="text-xs text-[#85858b] font-mono tabular-nums mb-1">
          {statusData.roomName} ({statusData.roomCode})
        </div>

        <h1 className="text-xl font-bold tracking-tight text-[#ededed]">
          {isPending && "Waiting for FOH approval"}
          {isApproved && "You are approved"}
          {isRejected && "Join request declined"}
          {isRemoved && "Removed from stage"}
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-[#a1a1a6] leading-relaxed max-w-sm mx-auto">
          {isPending &&
            "Your connection request is visible to the sound engineer. Keep this screen open; your device will automatically enter the stage console once approved."}
          {isApproved && "Redirecting to your stage mix console..."}
          {isRejected &&
            "The sound engineer declined your join request for this session. Please speak directly with FOH if this was unexpected."}
          {isRemoved &&
            "You were removed from this stage session by the FOH engineer."}
        </p>

        {/* Progress Track for Pending */}
        {isPending && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#232325]">
              <div className="h-full w-2/5 rounded-full bg-[#fc3b00] transition-all" />
            </div>
            <span className="text-[11px] font-mono text-[#85858b]">
              Live subscription active · No refresh needed
            </span>
          </div>
        )}

        {/* Room Ended Notice */}
        {isEnded && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-300">
            This stage room has ended or expired.
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          {isApproved && (
            <Link
              href={`/room/${roomId}/musician?participantId=${statusData.participantId}`}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#4cc38a] hover:bg-[#3fb07b] px-5 py-3 font-semibold text-sm text-black transition active:translate-y-px"
            >
              <span>Enter stage console</span>
              <ArrowRight size={16} />
            </Link>
          )}

          {(isRejected || isRemoved) && (
            <Link
              href="/join"
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#fc3b00] hover:bg-[#e03500] px-5 py-3 font-semibold text-sm text-white transition active:translate-y-px"
            >
              <ArrowLeft size={16} />
              <span>Back to join</span>
            </Link>
          )}

          <Link
            href="/"
            className="block text-xs font-medium text-[#85858b] hover:text-[#ededed] transition py-1"
          >
            Return to overview
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed]">
          <div className="flex items-center gap-2 text-xs text-[#85858b]">
            <Loader2 size={16} className="animate-spin text-[#fc3b00]" />
            <span>Connecting to StageSignal...</span>
          </div>
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}
