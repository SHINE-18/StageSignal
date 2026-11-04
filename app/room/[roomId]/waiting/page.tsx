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
  Radio,
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
      <main className="grid min-h-screen place-items-center bg-[#0C0D0E] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-5 text-[#f8fafc]">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#14100D] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-500/30">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-bold text-white">Session Credentials Missing</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300">
            No active musician session token found on this device. Please join the stage room using the room code or QR code.
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#DC143C]/20 hover:from-[#B80F32] hover:to-[#C2410C] transition"
          >
            Go to Join Screen
          </Link>
        </div>
      </main>
    );
  }

  // Loading state while connecting
  if (statusData === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0C0D0E] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-5 text-[#f8fafc]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#FFA726] border border-orange-500/30 shadow-lg shadow-orange-500/10">
            <Radio size={24} className="animate-spin text-[#FFA726]" />
          </div>
          <h2 className="text-base font-bold text-white">Connecting to Stage...</h2>
          <p className="text-xs text-slate-400 font-mono">
            Subscribing to FOH live approval channel
          </p>
        </div>
      </main>
    );
  }

  // Session Not Found / Invalid Token
  if (statusData.state !== "found") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0C0D0E] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-5 text-[#f8fafc]">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#14100D] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-white">Session Not Found</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300">
            {statusData.message || "Your stage access request was not found. Please rejoin."}
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#DC143C]/20 hover:from-[#B80F32] hover:to-[#C2410C] transition"
          >
            Rejoin Stage Room
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
    <main className="grid min-h-screen place-items-center bg-[#0C0D0E] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] px-4 py-8 text-[#f8fafc]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#14100D] p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
        {/* Beacon / Status Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl">
          {isPending && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC143C]/15 to-[#F97316]/15 text-[#FFA726] border border-orange-500/30">
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-orange-500 opacity-20 animate-ping" />
              <Clock size={36} className="animate-spin text-[#FFA726]" />
            </div>
          )}

          {isApproved && (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={44} className="animate-bounce text-emerald-400" />
            </div>
          )}

          {isRejected && (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-500/30">
              <XCircle size={44} className="text-red-400" />
            </div>
          )}

          {isRemoved && (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-500/30">
              <UserX size={44} className="text-amber-400" />
            </div>
          )}
        </div>

        {/* Musician Badge */}
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-[#1E1815] px-3.5 py-1 text-xs font-semibold text-slate-300">
          <span className="text-white font-bold">{statusData.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#FFA726] font-medium">{statusData.instrument}</span>
        </div>

        {/* Room Headline */}
        <div className="text-xs text-slate-400 font-mono mb-1">
          {statusData.roomName} ({statusData.roomCode})
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          {isPending && "Waiting for FOH Approval"}
          {isApproved && "You're Approved!"}
          {isRejected && "Join Request Declined"}
          {isRemoved && "Removed from Stage"}
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
          {isPending &&
            "Your connection request is visible to the sound engineer. Keep this screen open; your device will automatically enter the stage console once approved."}
          {isApproved && "Redirecting to your stage mix console..."}
          {isRejected &&
            "The sound engineer declined your join request for this session. Please speak directly with FOH if this was unexpected."}
          {isRemoved &&
            "You were removed from this stage session by the FOH engineer."}
        </p>

        {/* Pulsing Beacon Indicator for Pending */}
        {isPending && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E1815]">
              <div className="h-full w-1/2 animate-pulse-subtle rounded-full bg-gradient-to-r from-[#DC143C] to-[#F97316]" />
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Live subscription active · No refresh needed
            </span>
          </div>
        )}

        {/* Room Ended Notice */}
        {isEnded && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
            This stage room has ended or expired.
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {isApproved && (
            <Link
              href={`/room/${roomId}/musician?participantId=${statusData.participantId}`}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-98"
            >
              <span>Enter Stage Console</span>
              <ArrowRight size={18} />
            </Link>
          )}

          {(isRejected || isRemoved) && (
            <Link
              href="/join"
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#DC143C]/20 transition hover:from-[#B80F32] hover:to-[#C2410C] active:scale-98"
            >
              <ArrowLeft size={16} />
              <span>Back to Join</span>
            </Link>
          )}

          <Link
            href="/"
            className="block text-xs font-semibold text-slate-500 hover:text-slate-300 transition py-1"
          >
            Return to Overview
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
        <div className="grid min-h-screen place-items-center bg-[#0C0D0E] text-[#f8fafc]">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin text-[#FFA726]" />
            <span>Connecting to StageSignal...</span>
          </div>
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}
