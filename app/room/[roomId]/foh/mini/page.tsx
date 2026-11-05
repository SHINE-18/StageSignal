"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldAlert, Home } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getHostToken } from "../../../../../lib/session";
import { FohMiniConsole } from "../../../../../components/FohMiniConsole";

export default function FohMiniPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as Id<"rooms"> | undefined;

  const [hostToken, setHostToken] = useState<string | null>(null);
  const [checkedToken, setCheckedToken] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const token = getHostToken(roomId);
    setHostToken(token);
    setCheckedToken(true);
  }, [roomId]);

  if (!checkedToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] text-[#ededed]">
        <Loader2 className="animate-spin text-[#fc3b00]" size={24} />
      </main>
    );
  }

  if (!roomId || !hostToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#141415] p-4 text-[#ededed]">
        <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#19191b] p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#232325] text-amber-400 border border-white/[0.08]">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#ededed]">Access denied</h2>
            <p className="mt-1 text-xs text-[#85858b]">
              Host authentication token is missing or invalid on this device.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#fc3b00] hover:bg-[#e03500] py-2.5 text-xs font-semibold text-white transition active:translate-y-px"
          >
            <Home size={14} />
            <span>Return to home</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#141415] text-[#ededed]">
      <FohMiniConsole
        roomId={roomId}
        hostToken={hostToken}
        onSwitchToFull={() => router.push(`/room/${roomId}/foh`)}
      />
    </div>
  );
}
