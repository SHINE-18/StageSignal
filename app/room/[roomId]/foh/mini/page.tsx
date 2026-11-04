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
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] text-stone-900">
        <Loader2 className="animate-spin text-[#FFA726]" size={32} />
      </main>
    );
  }

  if (!roomId || !hostToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F5] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] p-4 text-stone-900">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#DC143C] border border-red-200">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Access Denied</h2>
            <p className="mt-1 text-xs text-stone-500">
              Host authentication token is missing or invalid on this device.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#EA580C] hover:from-[#B80F32] hover:to-[#C2410C] py-2.5 text-xs font-bold text-white shadow-md shadow-[#DC143C]/20 transition-colors"
          >
            <Home size={14} />
            <span>Return to Home</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <FohMiniConsole
        roomId={roomId}
        hostToken={hostToken}
        onSwitchToFull={() => router.push(`/room/${roomId}/foh`)}
      />
    </div>
  );
}
