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
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow text-white">
        <Loader2 className="animate-spin text-[#FF7145]" size={32} />
      </main>
    );
  }

  if (!roomId || !hostToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#000000] bg-arounda-glow bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#FC3B00] border border-red-200">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Access Denied</h2>
            <p className="mt-1 text-xs text-stone-500">
              Host authentication token is missing or invalid on this device.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] hover:from-[#E03500] hover:to-[#F2551D] py-2.5 text-xs font-bold text-white shadow-md shadow-[#FC3B00]/20 transition-colors"
          >
            <Home size={14} />
            <span>Return to Home</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] bg-arounda-glow">
      <FohMiniConsole
        roomId={roomId}
        hostToken={hostToken}
        onSwitchToFull={() => router.push(`/room/${roomId}/foh`)}
      />
    </div>
  );
}
